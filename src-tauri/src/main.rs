// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args: Vec<String> = std::env::args().collect();

    // Headless mode for scheduled tasks
    if args.iter().any(|a| a == "--silent") {
        let task = args.iter()
            .position(|a| a == "--task")
            .and_then(|i| args.get(i + 1))
            .map(|s| s.as_str());
        if let Some(t) = task {
            optimization_way_lib::headless::run_task(t);
        }
        return;
    }

    optimization_way_lib::run();
}
