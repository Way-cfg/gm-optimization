use serde::Serialize;
use crate::util::cmd;

#[derive(Debug, Serialize)]
pub struct DriveSummary {
    pub letter: String,
    pub size: String,
}

#[derive(Debug, Serialize)]
pub struct InitResult {
    pub cpu_name: String,
    pub gpu_name: String,
    pub ram_total: String,
    pub drives: Vec<DriveSummary>,
}

fn run_pwsh(script: &str) -> String {
    cmd("powershell")
        .args(["-Command", script])
        .output()
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default()
}

#[tauri::command]
pub async fn init_app() -> Result<InitResult, String> {
    let cpu_name = run_pwsh("(Get-CimInstance Win32_Processor).Name");
    let gpu_name = run_pwsh("(Get-CimInstance Win32_VideoController | Where-Object { $_.Name -notlike '*Microsoft*' -and $_.AdapterRAM -gt 0 } | Select-Object -First 1).Name");
    let ram_total = run_pwsh("[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1e9, 1)");

    let mut drives = Vec::new();
    let drives_raw = run_pwsh("Get-CimInstance Win32_LogicalDisk -Filter \"DriveType=3\" | Select-Object DeviceID, @{N='SizeGB';E={[math]::Round($_.Size/1e9,0)}} | ConvertTo-Csv -NoTypeInformation");
    for line in drives_raw.lines() {
        if line.is_empty() || line.starts_with('\"') && !line.starts_with("\"DeviceID\"") {
            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() >= 2 {
                let letter = parts[0].trim_matches('"').to_string();
                let size = parts[1].trim_matches('"').to_string();
                drives.push(DriveSummary { letter, size });
            }
        }
    }

    Ok(InitResult {
        cpu_name,
        gpu_name,
        ram_total: format!("{} GB", ram_total),
        drives,
    })
}
