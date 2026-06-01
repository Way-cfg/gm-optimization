use crate::db::Database;
use crate::models::*;
use crate::util::cmd;
use std::collections::HashMap;
use tauri::{State};

fn reg_set_dword(hkey: &str, path: &str, value: &str, data: u32) -> Result<(), String> {
    let full = format!("{}\\{}", hkey, path);
    let output = cmd("reg")
        .args(["add", &full, "/v", value, "/t", "REG_DWORD", "/d", &data.to_string(), "/f"])
        .output()
        .map_err(|e| format!("reg add failed: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to set {}: {}", full, stderr.trim()));
    }
    Ok(())
}

fn reg_delete_value(hkey: &str, path: &str, value: &str) -> Result<(), String> {
    let full = format!("{}\\{}", hkey, path);
    cmd("reg")
        .args(["delete", &full, "/v", value, "/f"])
        .output()
        .map_err(|e| format!("reg delete failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_all_tweaks(db: State<'_, Database>) -> Result<Vec<TweakInfo>, String> {
    let all = vec![
        TweakInfo { key: "ultimate_performance_power".into(), name: "Ultimate Performance Power Plan".into(), description: "Enable Ultimate Performance power plan".into(), category: "Performance".into(), enabled: false, requires_reboot: false },
        TweakInfo { key: "cpu_priority_separation".into(), name: "CPU Scheduling Optimization".into(), description: "Reduce CPU scheduling interval for lower latency".into(), category: "Performance".into(), enabled: false, requires_reboot: true },
        TweakInfo { key: "gpu_scheduling".into(), name: "GPU Hardware Scheduling".into(), description: "Enable GPU hardware-accelerated scheduling".into(), category: "Performance".into(), enabled: false, requires_reboot: true },
        TweakInfo { key: "disable_network_throttling".into(), name: "Disable Network Throttling".into(), description: "Remove network bandwidth throttling".into(), category: "Performance".into(), enabled: false, requires_reboot: false },
        TweakInfo { key: "disable_animations".into(), name: "Disable Visual Animations".into(), description: "Turn off window animations and effects".into(), category: "Performance".into(), enabled: false, requires_reboot: false },
        TweakInfo { key: "disable_telemetry".into(), name: "Disable Telemetry".into(), description: "Turn off Windows telemetry collection".into(), category: "Privacy".into(), enabled: false, requires_reboot: false },
        TweakInfo { key: "disable_diagnostic_logging".into(), name: "Disable Diagnostic Logging".into(), description: "Stop diagnostic data logging".into(), category: "Privacy".into(), enabled: false, requires_reboot: false },
        TweakInfo { key: "disable_cortana".into(), name: "Disable Cortana".into(), description: "Disable Cortana background execution".into(), category: "Privacy".into(), enabled: false, requires_reboot: false },
        TweakInfo { key: "privacy_cascade".into(), name: "Privacy Settings Cascade".into(), description: "Disable location, camera, mic, advertising ID".into(), category: "Privacy".into(), enabled: false, requires_reboot: false },
        TweakInfo { key: "disable_hibernation".into(), name: "Disable Hibernation".into(), description: "Free up disk space by removing hiberfil.sys".into(), category: "System".into(), enabled: false, requires_reboot: false },
        TweakInfo { key: "optimize_indexing".into(), name: "Optimize Search Indexing".into(), description: "Reduce search index scope".into(), category: "System".into(), enabled: false, requires_reboot: false },
        TweakInfo { key: "disable_sysmain".into(), name: "Disable SysMain".into(), description: "Stop Superfetch/prefetch service to free RAM".into(), category: "System".into(), enabled: false, requires_reboot: false },
        TweakInfo { key: "ntfs_optimize".into(), name: "NTFS Performance Tuning".into(), description: "Disable last access timestamps, optimize MFT zone".into(), category: "System".into(), enabled: false, requires_reboot: true },
        TweakInfo { key: "disable_hpet".into(), name: "Disable HPET".into(), description: "Switch to HPET-free timers for lower gaming latency".into(), category: "Extreme".into(), enabled: false, requires_reboot: true },
        TweakInfo { key: "disable_core_isolation".into(), name: "Disable Core Isolation".into(), description: "Turn off Memory Integrity (VBS) for benchmark gains".into(), category: "Extreme".into(), enabled: false, requires_reboot: true },
        TweakInfo { key: "disable_spectre_mitigations".into(), name: "Disable CPU Mitigations".into(), description: "Disable Spectre/Meltdown/Retpoline for max CPU perf".into(), category: "Extreme".into(), enabled: false, requires_reboot: true },
    ];

    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut saved = HashMap::new();
    if let Ok(mut stmt) = conn.prepare("SELECT tweak_key, enabled FROM tweak_settings") {
        for row in stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, bool>(1)?))).into_iter().flatten().flatten() {
            saved.insert(row.0, row.1);
        }
    }

    let mut result = all;
    for t in &mut result {
        if let Some(&enabled) = saved.get(&t.key) { t.enabled = enabled; }
    }
    Ok(result)
}

#[tauri::command]
pub async fn get_presets() -> Result<Vec<TweakPreset>, String> {
    Ok(vec![
        TweakPreset { id: "gaming".into(), name: "Gaming & Low Latency Mode".into(),
            description: "Power plan, CPU/GPU, HPET off, no throttling".into(),
            tweak_keys: vec!["ultimate_performance_power".into(), "cpu_priority_separation".into(),
                "gpu_scheduling".into(), "disable_network_throttling".into(), "disable_animations".into(),
                "disable_hpet".into()] },
        TweakPreset { id: "privacy".into(), name: "Privacy Hardening".into(),
            description: "Disable telemetry, diagnostics, Cortana, privacy cascade".into(),
            tweak_keys: vec!["disable_telemetry".into(), "disable_diagnostic_logging".into(),
                "disable_cortana".into(), "privacy_cascade".into()] },
        TweakPreset { id: "storage".into(), name: "Max Storage Saver".into(),
            description: "Disable hibernation and optimize indexing".into(),
            tweak_keys: vec!["disable_hibernation".into(), "optimize_indexing".into()] },
        TweakPreset { id: "benchmarking".into(), name: "Benchmarking Mode".into(),
            description: "Core Isolation off, CPU mitigations off, SysMain off, power plan".into(),
            tweak_keys: vec!["disable_core_isolation".into(), "disable_spectre_mitigations".into(),
                "disable_sysmain".into(), "ultimate_performance_power".into()] },
    ])
}

#[tauri::command]
pub async fn apply_tweak(db: State<'_, Database>, tweak_key: String, enabled: bool) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO tweak_settings (tweak_key, enabled, requires_reboot) VALUES (?1, ?2, 0) ON CONFLICT(tweak_key) DO UPDATE SET enabled = ?2",
        rusqlite::params![tweak_key, enabled],
    ).map_err(|e| e.to_string())?;
    drop(conn);

    match tweak_key.as_str() {
        "ultimate_performance_power" => {
            if enabled {
                let _ = cmd("powercfg")
                    .args(["/setactive", "{e9a42b02-d5df-448d-aa00-03f14749eb61}"])
                    .output();
            }
        }
        "cpu_priority_separation" => {
            let val = if enabled { 38u32 } else { 24u32 };
            let _ = reg_set_dword("HKLM", r"SYSTEM\CurrentControlSet\Control\PriorityControl", "Win32PrioritySeparation", val);
        }
        "gpu_scheduling" => {
            let val = if enabled { 1u32 } else { 0u32 };
            let _ = reg_set_dword("HKCU", r"Software\Microsoft\DirectX\UserGpuPreferences", "HwSchEnabled", val);
        }
        "disable_network_throttling" => {
            let val = if enabled { 0xffffffffu32 } else { 0xau32 };
            let _ = reg_set_dword("HKLM", r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile", "NetworkThrottlingIndex", val);
        }
        "disable_animations" => {
            let val = if enabled { 2u32 } else { 1u32 };
            let _ = reg_set_dword("HKCU", r"Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects", "VisualFXSetting", val);
        }
        "disable_telemetry" => {
            let val = if enabled { 0u32 } else { 3u32 };
            let _ = reg_set_dword("HKLM", r"SOFTWARE\Policies\Microsoft\Windows\DataCollection", "AllowTelemetry", val);
            let action = if enabled { "stop" } else { "start" };
            let _ = cmd("sc").args([action, "DiagTrack"]).output();
        }
        "disable_diagnostic_logging" => {
            let val = if enabled { 0u32 } else { 1u32 };
            let _ = reg_set_dword("HKLM", r"SOFTWARE\Microsoft\Windows\CurrentVersion\Diagnostics\DiagTrack", "DiagTrackEnabled", val);
        }
        "disable_cortana" => {
            if enabled {
                let _ = reg_set_dword("HKLM", r"SOFTWARE\Policies\Microsoft\Windows\Windows Search", "AllowCortana", 0);
                let _ = reg_set_dword("HKLM", r"SOFTWARE\Policies\Microsoft\Windows\Windows Search", "AllowSearchToUseLocation", 0);
            }
        }
        "privacy_cascade" => {
            let val = if enabled { 0u32 } else { 1u32 };
            let _ = reg_set_dword("HKCU", r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\location", "Value", val);
            let _ = reg_set_dword("HKCU", r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam", "Value", val);
            let _ = reg_set_dword("HKCU", r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone", "Value", val);
        }
        "disable_hibernation" => {
            if enabled {
                let _ = cmd("powercfg").args(["/h", "off"]).output();
            } else {
                let _ = cmd("powercfg").args(["/h", "on"]).output();
            }
        }
        "optimize_indexing" => {
            if enabled {
                let _ = cmd("cmd").args(["/C", "sc config WSearch start= disabled & sc stop WSearch"]).output();
            } else {
                let _ = cmd("cmd").args(["/C", "sc config WSearch start= auto & sc start WSearch"]).output();
            }
        }
        // New extreme tweaks
        "disable_hpet" => {
            if enabled {
                let _ = cmd("bcdedit")
                    .args(["/set", "useplatformclock", "false"]).output();
                let _ = cmd("bcdedit")
                    .args(["/set", "disabledynamictick", "yes"]).output();
            } else {
                let _ = cmd("bcdedit")
                    .args(["/deletevalue", "useplatformclock"]).output();
                let _ = cmd("bcdedit")
                    .args(["/deletevalue", "disabledynamictick"]).output();
            }
        }
        "disable_core_isolation" => {
            let key = r"SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity";
            if enabled {
                let _ = reg_set_dword("HKLM", key, "Enabled", 0);
            } else {
                let _ = reg_delete_value("HKLM", key, "Enabled");
            }
        }
        "ntfs_optimize" => {
            if enabled {
                let _ = cmd("fsutil")
                    .args(["behavior", "set", "disablelastaccess", "1"]).output();
                let _ = cmd("fsutil")
                    .args(["behavior", "set", "mftzone", "2"]).output();
            } else {
                let _ = cmd("fsutil")
                    .args(["behavior", "set", "disablelastaccess", "0"]).output();
                let _ = cmd("fsutil")
                    .args(["behavior", "set", "mftzone", "1"]).output();
            }
        }
        "disable_sysmain" => {
            if enabled {
                let _ = cmd("cmd")
                    .args(["/C", "sc config SysMain start= disabled & sc stop SysMain"]).output();
            } else {
                let _ = cmd("cmd")
                    .args(["/C", "sc config SysMain start= auto & sc start SysMain"]).output();
            }
        }
        "disable_spectre_mitigations" => {
            let key = r"SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management";
            if enabled {
                let _ = reg_set_dword("HKLM", key, "FeatureSettingsOverride", 3);
                let _ = reg_set_dword("HKLM", key, "FeatureSettingsOverrideMask", 3);
            } else {
                let _ = reg_delete_value("HKLM", key, "FeatureSettingsOverride");
                let _ = reg_delete_value("HKLM", key, "FeatureSettingsOverrideMask");
            }
        }
        _ => {}
    }
    Ok(())
}
