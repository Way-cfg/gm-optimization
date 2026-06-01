use crate::commands::system_info;
use crate::models::SystemInfo;

#[tauri::command]
pub async fn init_app() -> Result<SystemInfo, String> {
    system_info::collect_system_info().await
}
