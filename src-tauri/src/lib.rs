mod commands;
mod db;
pub mod headless;
mod models;
mod util;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let conn = db::initialize_database(app.handle())
                .expect("Failed to initialize database");
            app.handle().manage(conn);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::junk_cleaner::scan_junk,
            commands::junk_cleaner::clean_junk,
            commands::startup_manager::get_startup_entries,
            commands::startup_manager::toggle_startup_entry,
            commands::startup_manager::delete_startup_entry,
            commands::startup_manager::set_startup_delay,
            commands::startup_manager::add_startup_entry,
            commands::registry_cleaner::scan_registry,
            commands::registry_cleaner::clean_registry,
            commands::disk_analyzer::get_drives,
            commands::disk_analyzer::scan_drive,
            commands::disk_analyzer::delete_file,
            commands::process_manager::get_processes,
            commands::process_manager::kill_process,
            commands::process_manager::get_services,
            commands::process_manager::change_service_startup,
            commands::process_manager::control_service,
            commands::settings_tweaker::get_all_tweaks,
            commands::settings_tweaker::get_presets,
            commands::settings_tweaker::apply_tweak,
            commands::history::get_scan_history,
            commands::history::clear_scan_history,
            commands::exclusions::get_exclusions,
            commands::exclusions::add_exclusion,
            commands::exclusions::remove_exclusion,
            commands::scheduler::get_schedules,
            commands::scheduler::create_schedule,
            commands::scheduler::delete_schedule,
            commands::scheduler::toggle_schedule,
            commands::network_optimizer::get_network_adapters,
            commands::network_optimizer::get_network_tweaks,
            commands::network_optimizer::get_dns_servers,
            commands::network_optimizer::set_dns,
            commands::network_optimizer::restore_dns,
            commands::network_optimizer::flush_dns,
            commands::network_optimizer::apply_network_tweak,
            commands::system_info::get_system_info,
            commands::benchmark::run_disk_benchmark,
            commands::benchmark::run_network_benchmark,
            commands::benchmark::run_cpu_benchmark,
            commands::benchmark::run_all_benchmarks,
            commands::benchmark::get_benchmark_history,
            commands::benchmark::clear_benchmark_history,
            commands::restore::create_restore_point,
            commands::restore::get_restore_points,
            commands::restore::restore_system,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
