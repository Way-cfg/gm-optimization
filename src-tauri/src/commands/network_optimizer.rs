use crate::models::*;
use crate::util::cmd;

fn reg_set_dword(hkey: &str, path: &str, value: &str, data: u32) -> Result<(), String> {
    let full = format!("{}\\{}", hkey, path);
    let output = cmd("reg")
        .args(["add", &full, "/v", value, "/t", "REG_DWORD", "/d", &data.to_string(), "/f"])
        .output().map_err(|e| format!("reg add failed: {}", e))?;
    if !output.status.success() {
        return Err(format!("reg add failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    Ok(())
}

fn reg_delete_value(hkey: &str, path: &str, value: &str) -> Result<(), String> {
    let full = format!("{}\\{}", hkey, path);
    cmd("reg")
        .args(["delete", &full, "/v", value, "/f"])
        .output().ok();
    Ok(())
}

fn netsh(args: &[&str]) -> Result<String, String> {
    let out = cmd("netsh").args(args).output()
        .map_err(|e| format!("netsh failed: {}", e))?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).to_string());
    }
    Ok(String::from_utf8_lossy(&out.stdout).to_string())
}

#[tauri::command]
pub async fn get_network_adapters() -> Result<Vec<NetworkAdapterInfo>, String> {
    let mut adapters = Vec::new();
    let out = cmd("powershell")
        .args(["-Command", "Get-NetAdapter | Select-Object Name, InterfaceDescription, LinkSpeed, Status, InterfaceGuid | ConvertTo-Json -Compress"])
        .output().map_err(|e| format!("powershell failed: {}", e))?;
    let _stdout = String::from_utf8_lossy(&out.stdout);
    // Fallback: parse netsh output
    let n_out = netsh(&["interface", "ip", "show", "interfaces"])?;
    for line in n_out.lines() {
        let line = line.trim();
        if line.is_empty() || line.contains(" ") { continue; }
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 4 {
            let name = parts.last().unwrap_or(&"").to_string();
            adapters.push(NetworkAdapterInfo {
                name: name.clone(),
                guid: String::new(),
                description: String::new(),
                speed: parts.get(2).unwrap_or(&"-").to_string(),
                is_active: parts.get(1).unwrap_or(&"") == &"Connected",
            });
        }
    }
    Ok(adapters)
}

#[tauri::command]
pub async fn get_dns_servers() -> Result<Vec<DnsInfo>, String> {
    let mut dns_list = Vec::new();
    let out = netsh(&["interface", "ip", "show", "dnsservers"])?;
    let mut current_adapter = String::new();
    let mut servers = Vec::new();
    let mut is_dhcp = true;

    for line in out.lines() {
        let l = line.trim();
        if l.starts_with("Configuration for interface") {
            if !current_adapter.is_empty() {
                dns_list.push(DnsInfo { adapter: current_adapter.clone(), servers: servers.clone(), is_dhcp });
            }
            current_adapter = l.split('"').nth(1).unwrap_or("").to_string();
            servers.clear();
            is_dhcp = true;
        } else if l.contains("DHCP") || l.contains("dynamic") {
            is_dhcp = true;
            servers.clear();
        } else if l.contains("Statically Configured DNS Servers:") || l.contains("static") {
            is_dhcp = false;
        } else if l.contains('.') && (l.contains("1.") || l.contains("8.") || l.contains("9.") || l.contains("4.")) {
            // Extract IP-like patterns
            for word in l.split_whitespace() {
                let w = word.trim_end_matches(|c| c == ',' || c == ';' || c == '}');
                if w.contains('.') && w.chars().filter(|c| *c == '.').count() == 3 {
                    servers.push(w.to_string());
                }
            }
        }
    }
    if !current_adapter.is_empty() {
        dns_list.push(DnsInfo { adapter: current_adapter.clone(), servers, is_dhcp });
    }
    Ok(dns_list)
}

fn set_dns_on_adapter(adapter: &str, primary: &str, secondary: &str) -> Result<(), String> {
    netsh(&["interface", "ip", "set", "dnsservers", &format!("\"{}\"", adapter), "static", primary, "primary"])?;
    netsh(&["interface", "ip", "add", "dnsservers", &format!("\"{}\"", adapter), secondary, "index=2"])?;
    Ok(())
}

const DNS_CLOUDFLARE: (&str, &str) = ("1.1.1.1", "1.0.0.1");
const DNS_GOOGLE: (&str, &str) = ("8.8.8.8", "8.8.4.4");

#[tauri::command]
pub async fn set_dns(adapter: String, provider: String) -> Result<(), String> {
    match provider.as_str() {
        "cloudflare" => set_dns_on_adapter(&adapter, DNS_CLOUDFLARE.0, DNS_CLOUDFLARE.1),
        "google" => set_dns_on_adapter(&adapter, DNS_GOOGLE.0, DNS_GOOGLE.1),
        _ => Err(format!("Unknown DNS provider: {}", provider)),
    }
}

#[tauri::command]
pub async fn restore_dns(adapter: String) -> Result<(), String> {
    netsh(&["interface", "ip", "set", "dnsservers", &format!("\"{}\"", adapter), "dhcp"])?;
    Ok(())
}

#[tauri::command]
pub async fn flush_dns() -> Result<(), String> {
    let out = cmd("ipconfig").args(["/flushdns"]).output()
        .map_err(|e| format!("ipconfig failed: {}", e))?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn get_network_tweaks() -> Result<Vec<NetworkTweakInfo>, String> {
    // Check current state of registry/netsh for each tweak
    let mut tweaks = vec![
        NetworkTweakInfo { key: "disable_nagle".into(), name: "Disable Nagle's Algorithm".into(),
            description: "TCP NoDelay per interface — reduces latency for gaming".into(),
            category: "TCP/IP".into(), enabled: false, requires_reboot: false },
        NetworkTweakInfo { key: "tcp_autotuning_high".into(), name: "TCP Auto-Tuning: Normal".into(),
            description: "Set TCP window auto-tuning to normal level".into(),
            category: "TCP/IP".into(), enabled: false, requires_reboot: false },
        NetworkTweakInfo { key: "tcp_autotuning_disabled".into(), name: "TCP Auto-Tuning: Disabled".into(),
            description: "Disable TCP window scaling for max throughput stability".into(),
            category: "TCP/IP".into(), enabled: false, requires_reboot: false },
        NetworkTweakInfo { key: "tcp_fastopen".into(), name: "TCP Fast Open".into(),
            description: "Enable TCP Fast Open for quicker connection establishment".into(),
            category: "TCP/IP".into(), enabled: false, requires_reboot: false },
        NetworkTweakInfo { key: "enable_rss".into(), name: "Enable RSS".into(),
            description: "Receive Side Scaling — spreads network processing across cores".into(),
            category: "TCP/IP".into(), enabled: false, requires_reboot: false },
        NetworkTweakInfo { key: "disable_ecn".into(), name: "Disable ECN".into(),
            description: "Explicit Congestion Notification — can cause packet loss with some ISPs".into(),
            category: "TCP/IP".into(), enabled: false, requires_reboot: false },
        NetworkTweakInfo { key: "disable_ipv6".into(), name: "Disable IPv6".into(),
            description: "IPv6 can cause DNS timeouts — disable on all interfaces".into(),
            category: "Network Adapter".into(), enabled: false, requires_reboot: true },
        NetworkTweakInfo { key: "disable_eee".into(), name: "Disable Energy-Efficient Ethernet".into(),
            description: "Power-saving feature that adds latency on some adapters".into(),
            category: "Network Adapter".into(), enabled: false, requires_reboot: false },
        NetworkTweakInfo { key: "disable_interrupt_moderation".into(), name: "Disable Interrupt Moderation".into(),
            description: "Lower latency at cost of slightly higher CPU usage".into(),
            category: "Network Adapter".into(), enabled: false, requires_reboot: false },
        NetworkTweakInfo { key: "dns_cache_large".into(), name: "Large DNS Cache".into(),
            description: "Increase DNS cache size for faster repeat lookups".into(),
            category: "DNS".into(), enabled: false, requires_reboot: false },
    ];

    // Check Nagle's state
    let nagle_out = cmd("reg")
        .args(["query", "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces", "/s", "/v", "TCPNoDelay"])
        .output().ok();
    if let Some(o) = nagle_out {
        if o.status.success() {
            let s = String::from_utf8_lossy(&o.stdout);
            if s.contains("0x1") { tweaks[0].enabled = true; }
        }
    }

    // Check TCP auto-tuning
    let auto_out = cmd("netsh")
        .args(["int", "tcp", "show", "global"])
        .output().ok();
    if let Some(ref o) = auto_out {
        let s = String::from_utf8_lossy(&o.stdout);
        if s.contains("Receive Window Auto-Tuning Level") {
            if s.contains("disabled") { tweaks[2].enabled = true; }
            if s.contains("normal") { tweaks[1].enabled = true; }
        }
        if s.contains("Receive Side Scaling") && s.contains("enabled") {
            tweaks[4].enabled = true;
        }
        if s.contains("Fast Open") && s.contains("enabled") {
            tweaks[3].enabled = true;
        }
    }

    // Check IPv6 state
    let ipv6_out = cmd("reg")
        .args(["query", "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters", "/v", "DisabledComponents"])
        .output().ok();
    if let Some(o) = ipv6_out {
        if o.status.success() {
            let s = String::from_utf8_lossy(&o.stdout);
            if s.contains("0xff") { tweaks[6].enabled = true; }
        }
    }

    Ok(tweaks)
}

#[tauri::command]
pub async fn apply_network_tweak(tweak_key: String, enabled: bool) -> Result<(), String> {
    match tweak_key.as_str() {
        "disable_nagle" => {
            // Set TCPNoDelay and TcpAckFrequency on all interfaces
            let if_out = cmd("reg")
                .args(["query", "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces"])
                .output().map_err(|e| format!("reg query failed: {}", e))?;
            let stdout = String::from_utf8_lossy(&if_out.stdout);
            for line in stdout.lines() {
                let l = line.trim();
                if l.starts_with("HKLM") {
                    let guid_path = l.strip_prefix("HKLM\\").unwrap_or(l);
                    let val = if enabled { 1u32 } else { 0u32 };
                    let _ = reg_set_dword("HKLM", guid_path, "TCPNoDelay", val);
                    let _ = reg_set_dword("HKLM", guid_path, "TcpAckFrequency", val);
                }
            }
        }
        "tcp_autotuning_high" => {
            if enabled {
                let _ = netsh(&["int", "tcp", "set", "global", "autotuninglevel=normal"]);
            } else {
                let _ = netsh(&["int", "tcp", "set", "global", "autotuninglevel=disabled"]);
            }
        }
        "tcp_autotuning_disabled" => {
            if enabled {
                let _ = netsh(&["int", "tcp", "set", "global", "autotuninglevel=disabled"]);
            } else {
                let _ = netsh(&["int", "tcp", "set", "global", "autotuninglevel=normal"]);
            }
        }
        "tcp_fastopen" => {
            let val = if enabled { "enabled" } else { "disabled" };
            let _ = netsh(&["int", "tcp", "set", "global", &format!("fastopen={}", val)]);
        }
        "enable_rss" => {
            let val = if enabled { "enabled" } else { "disabled" };
            let _ = netsh(&["int", "tcp", "set", "global", &format!("rss={}", val)]);
        }
        "disable_ecn" => {
            let val = if enabled { 0u32 } else { 2u32 };
            let _ = reg_set_dword("HKLM", r"SYSTEM\CurrentControlSet\Services\Tcpip\Parameters", "EnableECN", val);
        }
        "disable_ipv6" => {
            if enabled {
                reg_set_dword("HKLM", r"SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters", "DisabledComponents", 0xFF)?;
            } else {
                reg_delete_value("HKLM", r"SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters", "DisabledComponents")?;
            }
        }
        "disable_eee" => {
            // Try to disable Energy-Efficient Ethernet via PowerShell
            let ps_cmd = if enabled {
                "Get-NetAdapter | Disable-NetAdapterPowerManagement -SystemIdle -SelectiveSuspend -DeviceSleepOnDisconnect"
            } else {
                "Get-NetAdapter | Enable-NetAdapterPowerManagement -SystemIdle -SelectiveSuspend -DeviceSleepOnDisconnect"
            };
            let _ = cmd("powershell")
                .args(["-Command", ps_cmd])
                .output();
            // Also try registry per adapter
            let eee_key = r"SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}";
            let adapters_out = cmd("reg")
                .args(["query", &format!("HKLM\\{}", eee_key)])
                .output().ok();
            if let Some(o) = adapters_out {
                let s = String::from_utf8_lossy(&o.stdout);
                for line in s.lines() {
                    let l = line.trim();
                    if l.starts_with("HKLM") && l.contains("\\") {
                        if let Some(sub) = l.strip_prefix("HKLM\\") {
                            let val = if enabled { 0u32 } else { 1u32 };
                            let _ = reg_set_dword("HKLM", sub, "EEE", val);
                            let _ = reg_set_dword("HKLM", sub, "*EEE", val);
                            let _ = reg_set_dword("HKLM", sub, "WakeOnMagicPacket", 0);
                        }
                    }
                }
            }
        }
        "disable_interrupt_moderation" => {
            let ps_cmd = if enabled {
                "Get-NetAdapter | Set-NetAdapterAdvancedProperty -DisplayName 'Interrupt Moderation' -DisplayValue 'Disabled' -ErrorAction SilentlyContinue"
            } else {
                "Get-NetAdapter | Set-NetAdapterAdvancedProperty -DisplayName 'Interrupt Moderation' -DisplayValue 'Enabled' -ErrorAction SilentlyContinue"
            };
            let _ = cmd("powershell")
                .args(["-Command", ps_cmd])
                .output();
        }
        "dns_cache_large" => {
            if enabled {
                let _ = cmd("cmd")
                    .args(["/C", "ipconfig /flushdns & reg add HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters /v CacheSize /t REG_DWORD /d 65536 /f"])
                    .output();
            } else {
                let _ = reg_delete_value("HKLM", r"SYSTEM\CurrentControlSet\Services\Dnscache\Parameters", "CacheSize");
            }
        }
        _ => {}
    }
    Ok(())
}
