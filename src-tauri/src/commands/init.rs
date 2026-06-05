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
    let drives_raw = run_pwsh("Get-CimInstance Win32_LogicalDisk -Filter \"DriveType=3\" | Select-Object DeviceID, @{N='SizeGB';E={[math]::Round($_.Size/1e9,0)}} | ConvertTo-Json -Compression");
    if !drives_raw.is_empty() && drives_raw != "[]" && drives_raw != "\n" {
        let json = if drives_raw.trim().starts_with('[') { drives_raw.trim().to_string() } else { format!("[{}]", drives_raw.trim()) };
        if let Ok(parsed) = serde_json::from_str::<Vec<serde_json::Value>>(&json) {
            for item in &parsed {
                if let (Some(letter), Some(size)) = (
                    item.get("DeviceID").and_then(|v| v.as_str()),
                    item.get("SizeGB").and_then(|v| v.as_str()),
                ) {
                    drives.push(DriveSummary { letter: letter.to_string(), size: size.to_string() });
                }
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
