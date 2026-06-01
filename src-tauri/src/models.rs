use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JunkCategoryResult {
    pub category_id: String,
    pub category_name: String,
    pub file_count: u64,
    pub total_size: u64,
    pub files: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JunkScanResult {
    pub categories: Vec<JunkCategoryResult>,
    pub total_size: u64,
    pub total_files: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanResult {
    pub items_removed: u64,
    pub space_freed: u64,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartupEntry {
    pub id: Option<i64>,
    pub name: String,
    pub source: String,
    pub command: String,
    pub enabled: bool,
    pub delay_seconds: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryIssue {
    pub id: String,
    pub key_path: String,
    pub value_name: String,
    pub current_value: String,
    pub risk_level: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryScanResult {
    pub safe: Vec<RegistryIssue>,
    pub moderate: Vec<RegistryIssue>,
    pub risky: Vec<RegistryIssue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriveInfo {
    pub name: String,
    pub label: String,
    pub total_space: u64,
    pub free_space: u64,
    pub file_system: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreemapNode {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub file_type: String,
    pub is_directory: bool,
    pub children: Vec<TreemapNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory_mb: u64,
    pub is_system: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceInfo {
    pub name: String,
    pub display_name: String,
    pub status: String,
    pub startup_type: String,
    pub is_system: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TweakInfo {
    pub key: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub enabled: bool,
    pub requires_reboot: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TweakPreset {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tweak_keys: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanHistoryEntry {
    pub id: i64,
    pub module: String,
    pub scanned_at: String,
    pub total_size: i64,
    pub item_count: i64,
    pub result_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExclusionEntry {
    pub id: i64,
    pub path: String,
    pub added_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub cpu: Vec<InfoEntry>,
    pub gpu: Vec<InfoEntry>,
    pub ram: Vec<InfoEntry>,
    pub motherboard: Vec<InfoEntry>,
    pub storage: Vec<InfoEntry>,
    pub network: Vec<InfoEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfoEntry {
    pub label: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkResult {
    pub id: i64,
    pub benchmark_type: String,
    pub score: f64,
    pub unit: String,
    pub profile_name: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestorePointInfo {
    pub description: String,
    pub created_at: String,
    pub sequence_number: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Schedule {
    pub id: i64,
    pub name: String,
    pub module: String,
    pub schedule_type: String,
    pub time: Option<String>,
    pub day: Option<String>,
    pub enabled: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkTweakInfo {
    pub key: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub enabled: bool,
    pub requires_reboot: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkAdapterInfo {
    pub name: String,
    pub guid: String,
    pub description: String,
    pub speed: String,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsInfo {
    pub adapter: String,
    pub servers: Vec<String>,
    pub is_dhcp: bool,
}
