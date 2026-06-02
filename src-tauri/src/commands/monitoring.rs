use crate::models::{NetworkSpeed, PerformanceMetrics, SystemStatus};
use crate::util::cmd;

fn run_pwsh(script: &str) -> String {
    cmd("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output()
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default()
}

fn parse_f64(val: &str) -> Option<f64> {
    if val.is_empty() || val.eq_ignore_ascii_case("unavailable") || val.eq_ignore_ascii_case("null") {
        return None;
    }
    val.replace(',', ".").parse::<f64>().ok()
}

#[tauri::command]
pub async fn get_performance_metrics() -> Result<PerformanceMetrics, String> {
    let script = r#"
$ErrorActionPreference = 'SilentlyContinue'

# CPU
$cpu = 0.0
try {
    $cpu = (Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor | Where-Object Name -eq '_Total').PercentProcessorTime
    if (-not $cpu) { $cpu = 0.0 }
} catch {}

# RAM
$ramUsedGB = 0.0; $ramTotalGB = 0.0; $ramPct = 0.0
try {
    $os = Get-CimInstance Win32_OperatingSystem
    if ($os) {
        $total = $os.TotalVisibleMemorySize
        $free = $os.FreePhysicalMemory
        $used = $total - $free
        $ramTotalGB = [math]::Round($total / 1MB, 1)
        $ramUsedGB = [math]::Round($used / 1MB, 1)
        $ramPct = [math]::Round($used / $total * 100, 1)
    }
} catch {}

# Disk (system drive)
$diskUsedGB = 0.0; $diskTotalGB = 0.0; $diskPct = 0.0
try {
    $disk = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -gt 0 -and $_.Root -eq $env:SystemDrive }
    if ($disk) {
        $diskUsedGB = [math]::Round($disk.Used / 1GB, 1)
        $diskTotalGB = [math]::Round(($disk.Used + $disk.Free) / 1GB, 1)
        $diskPct = [math]::Round($disk.Used / ($disk.Used + $disk.Free) * 100, 1)
    }
} catch {}

# GPU usage
$gpuUsage = $null
try {
    $engines = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction Stop | Where-Object { $_.Name -like '*3D*' }
    if ($engines) {
        $avg = ($engines | Measure-Object -Property PercentUtilization -Average).Average
        if ($avg -ne $null) { $gpuUsage = [math]::Round($avg, 1) }
    }
} catch {}

# VRAM
$vramUsedGB = $null; $vramTotalGB = $null; $vramPct = $null
try {
    $adapter = Get-CimInstance Win32_VideoController -ErrorAction Stop | Where-Object { $_.AdapterRAM -gt 0 -and $_.Name -notlike '*Microsoft*' } | Select-Object -First 1
    if ($adapter) {
        $vramTotalBytes = $adapter.AdapterRAM
        $vramTotalGB = [math]::Round($vramTotalBytes / 1GB, 1)
        $nvidiaPaths = @("nvidia-smi", "$env:ProgramFiles\NVIDIA Corporation\NVSMI\nvidia-smi.exe", "${env:SystemRoot}\System32\nvidia-smi.exe")
        $nvidiaExe = $null
        foreach ($p in $nvidiaPaths) { if (Get-Command $p -ErrorAction SilentlyContinue) { $nvidiaExe = $p; break } }
        $nvidiaOut = if ($nvidiaExe) { & $nvidiaExe --query-gpu=memory.used,memory.total --format=csv,noheader,nounits 2>&1 } else { $null }
        if ($nvidiaOut -and $LASTEXITCODE -eq 0) {
            $parts = ($nvidiaOut -split ',').Trim()
            if ($parts.Count -ge 2) {
                $usedMB = [double]$parts[0]
                $totalMB = [double]$parts[1]
                $vramUsedGB = [math]::Round($usedMB / 1024, 1)
                $vramTotalGB = [math]::Round($totalMB / 1024, 1)
                if ($totalMB -gt 0) { $vramPct = [math]::Round($usedMB / $totalMB * 100, 1) }
            }
        }
    }
} catch {}

# CPU temperature
$cpuTemp = $null
try {
    $thermal = Get-CimInstance MSAcpi_ThermalZoneTemperature -ErrorAction Stop | Select-Object -First 1
    if ($thermal -and $thermal.CurrentTemperature -gt 0) {
        $cpuTemp = [math]::Round(($thermal.CurrentTemperature - 2732) / 10, 1)
    }
} catch {}

# GPU temperature
$gpuTemp = $null
try {
    $nvidiaPaths = @("nvidia-smi", "$env:ProgramFiles\NVIDIA Corporation\NVSMI\nvidia-smi.exe", "${env:SystemRoot}\System32\nvidia-smi.exe")
    $nvidiaExe = $null
    foreach ($p in $nvidiaPaths) { if (Get-Command $p -ErrorAction SilentlyContinue) { $nvidiaExe = $p; break } }
    $nvidiaTemp = if ($nvidiaExe) { & $nvidiaExe --query-gpu=temperature.gpu --format=csv,noheader,nounits 2>&1 } else { $null }
    if ($nvidiaTemp -and $LASTEXITCODE -eq 0 -and $nvidiaTemp -match '^\d+') { $gpuTemp = [math]::Round([double]$nvidiaTemp, 1) }
} catch {}

# Output pipe-delimited
Write-Output "$cpu|$ramUsedGB|$ramTotalGB|$ramPct|$diskUsedGB|$diskTotalGB|$diskPct|$gpuUsage|$vramUsedGB|$vramTotalGB|$vramPct|$cpuTemp|$gpuTemp"
"#;

    let output = run_pwsh(script);
    let parts: Vec<&str> = output.split('|').collect();

    if parts.len() < 13 {
        return Err("Failed to parse performance metrics".into());
    }

    Ok(PerformanceMetrics {
        cpu_usage: parse_f64(parts[0]).unwrap_or(0.0),
        ram_used_gb: parse_f64(parts[1]).unwrap_or(0.0),
        ram_total_gb: parse_f64(parts[2]).unwrap_or(0.0),
        ram_percent: parse_f64(parts[3]).unwrap_or(0.0),
        disk_used_gb: parse_f64(parts[4]).unwrap_or(0.0),
        disk_total_gb: parse_f64(parts[5]).unwrap_or(0.0),
        disk_percent: parse_f64(parts[6]).unwrap_or(0.0),
        gpu_usage: parse_f64(parts[7]),
        vram_used_gb: parse_f64(parts[8]),
        vram_total_gb: parse_f64(parts[9]),
        vram_percent: parse_f64(parts[10]),
        cpu_temp_celsius: parse_f64(parts[11]),
        gpu_temp_celsius: parse_f64(parts[12]),
    })
}

#[tauri::command]
pub async fn get_network_speed() -> Result<NetworkSpeed, String> {
    let script = r#"
$ErrorActionPreference = 'SilentlyContinue'
$dl = 0.0; $ul = 0.0
try {
    $interfaces = Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface -ErrorAction Stop | Where-Object { $_.Name -notmatch 'isatap|Loopback|Teredo|6to4|Software Loopback' }
    if ($interfaces) {
        $dl = ($interfaces | Measure-Object -Property BytesReceivedPersec -Sum).Sum
        $ul = ($interfaces | Measure-Object -Property BytesSentPersec -Sum).Sum
    }
} catch {}
Write-Output "$dl|$ul"
"#;

    let output = run_pwsh(script);
    let parts: Vec<&str> = output.split('|').collect();

    if parts.len() < 2 {
        return Err("Failed to parse network speed".into());
    }

    Ok(NetworkSpeed {
        download_bytes_per_sec: parse_f64(parts[0]).unwrap_or(0.0),
        upload_bytes_per_sec: parse_f64(parts[1]).unwrap_or(0.0),
    })
}

#[tauri::command]
pub async fn get_system_status() -> Result<SystemStatus, String> {
    let script = r#"
$ErrorActionPreference = 'SilentlyContinue'

# Power plan
$powerPlan = "Unknown"
try {
    $scheme = powercfg /getactivescheme
    if ($scheme -match '\((.+?)\)') { $powerPlan = $matches[1] }
} catch {}

# Uptime
$uptime = "Unknown"
try {
    $os = Get-CimInstance Win32_OperatingSystem
    if ($os) {
        $boot = $os.LastBootUpTime
        $span = (Get-Date) - $boot
        $uptime = "$($span.Days)d $($span.Hours)h $($span.Minutes)m"
    }
} catch {}

# Windows version
$winVer = "Unknown"; $winBuild = "Unknown"
try {
    $os = Get-CimInstance Win32_OperatingSystem
    if ($os) {
        $winVer = $os.Caption
        $winBuild = "$($os.Version) (Build $($os.BuildNumber))"
    }
} catch {}

Write-Output "$powerPlan|$uptime|$winVer|$winBuild"
"#;

    let output = run_pwsh(script);
    let parts: Vec<&str> = output.splitn(4, '|').collect();

    if parts.len() < 4 {
        return Err("Failed to parse system status".into());
    }

    Ok(SystemStatus {
        power_plan: parts[0].to_string(),
        uptime: parts[1].to_string(),
        windows_version: parts[2].to_string(),
        windows_build: parts[3].to_string(),
    })
}
