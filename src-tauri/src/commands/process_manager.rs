use crate::models::*;
use crate::util::cmd;
use sysinfo::{System};

fn is_system(name: &str) -> bool {
    let sys = ["System","System Idle Process","smss.exe","csrss.exe","wininit.exe",
        "winlogon.exe","services.exe","lsass.exe","svchost.exe","spoolsv.exe",
        "dwm.exe","explorer.exe","taskhostw.exe","sihost.exe"];
    sys.contains(&name)
}

#[tauri::command]
pub async fn get_processes() -> Result<Vec<ProcessInfo>, String> {
    let mut system = System::new_all();
    system.refresh_all();
    let mut procs: Vec<ProcessInfo> = system.processes().iter().map(|(pid, p)| ProcessInfo {
        pid: usize::from(*pid) as u32,
        name: p.name().to_string_lossy().to_string(),
        cpu_usage: p.cpu_usage(),
        memory_mb: p.memory() / (1024 * 1024),
        is_system: is_system(&p.name().to_string_lossy().to_string()),
    }).collect();
    procs.sort_by(|a, b| b.cpu_usage.partial_cmp(&a.cpu_usage).unwrap_or(std::cmp::Ordering::Equal));
    procs.truncate(500);
    Ok(procs)
}

#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<(), String> {
    let output = cmd("taskkill")
        .args(["/f", "/pid", &pid.to_string()])
        .output()
        .map_err(|e| format!("Failed to execute taskkill: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to kill PID {}: {}", pid, stderr.trim()));
    }
    Ok(())
}

fn parse_sc_query_output(stdout: &str) -> Vec<ServiceInfo> {
    let mut services = Vec::new();
    let mut current = ServiceInfo {
        name: String::new(), display_name: String::new(),
        status: String::new(), startup_type: String::new(), is_system: false,
    };
    let mut in_service = false;

    for line in stdout.lines() {
        let l = line.trim();
        if l.starts_with("SERVICE_NAME:") {
            if in_service && !current.name.is_empty() {
                services.push(current.clone());
            }
            current = ServiceInfo {
                name: l.trim_start_matches("SERVICE_NAME:").trim().to_string(),
                display_name: String::new(), status: String::new(),
                startup_type: String::new(), is_system: false,
            };
            in_service = true;
        } else if in_service {
            if let Some(disp) = l.strip_prefix("DISPLAY_NAME:") {
                current.display_name = disp.trim().to_string();
            } else if let Some(st) = l.strip_prefix("STATE:") {
                let st = st.trim();
                if st.contains("RUNNING") {
                    current.status = "Running".into();
                } else if st.contains("STOPPED") {
                    current.status = "Stopped".into();
                } else if st.contains("PAUSED") {
                    current.status = "Paused".into();
                } else {
                    current.status = "Unknown".into();
                }
            } else if let Some(typ) = l.strip_prefix("START_TYPE:") {
                let typ = typ.trim();
                if typ.starts_with("3") || typ.contains("DEMAND_START") {
                    current.startup_type = "Manual".into();
                } else if typ.starts_with("2") || typ.contains("AUTO_START") {
                    current.startup_type = "Automatic".into();
                } else if typ.starts_with("4") || typ.contains("DISABLED") {
                    current.startup_type = "Disabled".into();
                } else {
                    current.startup_type = typ.to_string();
                }
            }
        }
    }
    if in_service && !current.name.is_empty() {
        services.push(current);
    }
    services
}

#[tauri::command]
pub async fn get_services() -> Result<Vec<ServiceInfo>, String> {
    let output = cmd("sc")
        .args(["query", "type=", "service", "state=", "all"])
        .output()
        .map_err(|e| format!("Failed to query services: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("sc query failed: {}", stderr.trim()));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut services = parse_sc_query_output(&stdout);

    // Get detailed startup type for each service
    for s in &mut services {
        let det = cmd("sc")
            .args(["qc", &s.name])
            .output();
        if let Ok(o) = det {
            if o.status.success() {
                let det_out = String::from_utf8_lossy(&o.stdout);
                for line in det_out.lines() {
                    let l = line.trim();
                    if let Some(typ) = l.strip_prefix("START_TYPE:") {
                        let typ = typ.trim();
                        if typ.starts_with("3") || typ.contains("DEMAND_START") {
                            s.startup_type = "Manual".into();
                        } else if typ.starts_with("2") || typ.contains("AUTO_START") {
                            if typ.contains("DELAYED") {
                                s.startup_type = "Automatic (Delayed)".into();
                            } else {
                                s.startup_type = "Automatic".into();
                            }
                        } else if typ.starts_with("4") || typ.contains("DISABLED") {
                            s.startup_type = "Disabled".into();
                        }
                    }
                }
            }
        }
    }

    services.sort_by(|a, b| a.display_name.cmp(&b.display_name));
    Ok(services)
}

#[tauri::command]
pub async fn change_service_startup(service_name: String, startup_type: String) -> Result<(), String> {
    let sc_type = match startup_type.as_str() {
        "Automatic" => "auto",
        "Automatic (Delayed)" => "delayed-auto",
        "Manual" => "demand",
        "Disabled" => "disabled",
        _ => "demand",
    };
    let output = cmd("sc")
        .args(["config", &service_name, "start=", sc_type])
        .output()
        .map_err(|e| format!("Failed to change service config: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to change startup type: {}", stderr.trim()));
    }
    Ok(())
}

#[tauri::command]
pub async fn control_service(service_name: String, action: String) -> Result<(), String> {
    let sc_action = match action.as_str() {
        "start" => "start",
        "stop" => "stop",
        _ => return Err(format!("Unknown action: {}", action)),
    };
    let output = cmd("sc")
        .args([sc_action, &service_name])
        .output()
        .map_err(|e| format!("Failed to {} service: {}", sc_action, e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to {} service {}: {}", sc_action, service_name, stderr.trim()));
    }
    Ok(())
}
