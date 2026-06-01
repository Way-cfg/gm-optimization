use crate::models::RestorePointInfo;
use crate::util::cmd;

#[tauri::command]
pub async fn create_restore_point(label: String) -> Result<String, String> {
    let desc = format!("'Optimization Way - {}'", label.replace('\'', ""));
    let ps = format!(
        "Checkpoint-Computer -Description {} -RestorePointType MODIFY_SETTINGS",
        desc
    );
    let output = cmd("powershell")
        .args(["-Command", &ps])
        .output()
        .map_err(|e| format!("PowerShell failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(format!("Restore point created: {}", label))
    } else {
        // Restore points might not be enabled
        if stderr.contains("not enabled") || stdout.contains("not enabled") {
            Err("System Restore is not enabled on this drive. Enable it in System Properties > System Protection first.".into())
        } else {
            Err(format!("Failed: {} {}", stderr, stdout))
        }
    }
}

#[tauri::command]
pub async fn get_restore_points() -> Result<Vec<RestorePointInfo>, String> {
    let output = cmd("powershell")
        .args(["-Command", "Get-ComputerRestorePoint | Select-Object Description, CreationTime, SequenceNumber | ConvertTo-Csv -NoTypeInformation"])
        .output()
        .map_err(|e| format!("PowerShell failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut points = Vec::new();

    for line in stdout.lines().skip(1) {
        if line.is_empty() { continue; }
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() >= 3 {
            let description = parts[0].trim_matches('"').to_string();
            let created_at = parts[1].trim_matches('"').to_string();
            let seq = parts[2].trim_matches('"').parse::<i64>().unwrap_or(0);
            points.push(RestorePointInfo { description, created_at, sequence_number: seq });
        }
    }
    Ok(points)
}

#[tauri::command]
pub async fn restore_system(sequence_number: i64) -> Result<String, String> {
    let ps = format!("Restore-Computer -RestorePoint {}", sequence_number);
    let output = cmd("powershell")
        .args(["-Command", &ps])
        .output()
        .map_err(|e| format!("PowerShell failed: {}", e))?;

    if output.status.success() {
        Ok("System restore initiated. Your computer will restart.".into())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Restore failed: {}", stderr))
    }
}
