// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod jlink;

use jlink::JLink;
use serde::Serialize;
use tauri::Emitter;
use jlink::initialize_jlink_path;

#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStrExt;
#[cfg(target_os = "windows")]
use std::ffi::OsStr;
#[cfg(target_os = "windows")]
use std::iter::once;

/// On Windows, converts a path to its short (8.3) form to avoid issues with
/// non-ASCII characters (Russian, etc.) and spaces when passing to JLink.exe.
/// On non-Windows platforms, returns the path unchanged.
fn normalize_path_for_jlink(path: &str) -> String {
    #[cfg(target_os = "windows")]
    {
        let wide: Vec<u16> = OsStr::new(path)
            .encode_wide()
            .chain(once(0))
            .collect();

        // Call GetShortPathNameW to get the short path
        unsafe {
            // First call to get the required buffer size
            let len = windows_kernel32::GetShortPathNameW(wide.as_ptr(), std::ptr::null_mut(), 0);
            if len == 0 {
                // If GetShortPathNameW fails, return original path
                return path.to_string();
            }
            let mut buffer: Vec<u16> = vec![0; len as usize];
            let result = windows_kernel32::GetShortPathNameW(wide.as_ptr(), buffer.as_mut_ptr(), len);
            if result == 0 {
                return path.to_string();
            }
            // Convert back to String
            let short_path = String::from_utf16_lossy(&buffer[..result as usize]);
            return short_path;
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        path.to_string()
    }
}

#[tauri::command]
async fn run_program(program: String, args: Vec<String>) -> Result<String, String> {
    let output = std::process::Command::new(&program)
        .args(&args)
        .output()
        .map_err(|e| format!("Не удалось запустить программу: {}", e))?;

    if output.status.success() {
        Ok(format!(
            "Выход: {}",
            String::from_utf8_lossy(&output.stdout)
        ))
    } else {
        Err(format!(
            "Ошибка (код {}): {}",
            output.status.code().unwrap_or(-1),
            String::from_utf8_lossy(&output.stderr)
        ))
    }
}

fn create_jlink_with_params(params: &jlink::ConnectionParams) -> JLink {
    JLink::new(&params.device).with_connection_params(params)
}

#[derive(Serialize, Clone)]
struct JLinkOutputEvent {
    stream: String,
    text: String,
}

async fn execute_jlink_command_with_events(
    window: tauri::Window,
    jlink: JLink,
    commands: Vec<String>,
) -> Result<jlink::JLinkResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        jlink.execute_commands_stream(&commands, move |stream, text| {
            let _ = window.emit(
                "jlink-output",
                JLinkOutputEvent {
                    stream: stream.to_string(),
                    text: text.to_string(),
                },
            );
        })
    })
    .await
    .map_err(|e| format!("Failed to execute JLink: {}", e))?
}

#[tauri::command]
async fn jlink_reset(
    window: tauri::Window,
    connection_params: jlink::ConnectionParams,
) -> Result<jlink::JLinkResult, String> {
    let jlink = create_jlink_with_params(&connection_params);
    execute_jlink_command_with_events(window, jlink, vec!["r".to_string()]).await
}

#[tauri::command]
async fn jlink_pin_reset(
    window: tauri::Window,
    connection_params: jlink::ConnectionParams,
) -> Result<jlink::JLinkResult, String> {
    let jlink = create_jlink_with_params(&connection_params);
    execute_jlink_command_with_events(window, jlink, vec!["r".to_string(), "1".to_string()]).await
}

#[tauri::command]
async fn jlink_erase_all(
    window: tauri::Window,
    connection_params: jlink::ConnectionParams,
) -> Result<jlink::JLinkResult, String> {
    let jlink = create_jlink_with_params(&connection_params);
    execute_jlink_command_with_events(
        window,
        jlink,
        vec![
            "erase".to_string(),
            "r".to_string(),
            "g".to_string(),
            "q".to_string(),
        ],
    )
    .await
}

#[tauri::command]
async fn jlink_program(
    window: tauri::Window,
    firmware_path: String,
    connection_params: jlink::ConnectionParams,
) -> Result<jlink::JLinkResult, String> {
    let jlink = create_jlink_with_params(&connection_params);
    // Normalize path for JLink: convert to short path on Windows to handle
    // non-ASCII characters (Russian letters) and spaces in the path
    let normalized_path = normalize_path_for_jlink(&firmware_path);
    let escaped_path = normalized_path.replace('"', r#"\""#);
    let commands = vec![
        "r".to_string(),
        "h".to_string(),
        format!("loadfile \"{}\"", escaped_path),
        "r".to_string(),
        "g".to_string(),
        "q".to_string(),
    ];
    execute_jlink_command_with_events(window, jlink, commands).await
}

#[tauri::command]
async fn jlink_execute_commands(
    window: tauri::Window,
    commands: Vec<String>,
    connection_params: jlink::ConnectionParams,
) -> Result<jlink::JLinkResult, String> {
    let jlink = create_jlink_with_params(&connection_params);
    execute_jlink_command_with_events(window, jlink, commands).await
}

#[tauri::command]
async fn jlink_is_installed() -> Result<bool, String> {
    Ok(JLink::new("dummy").is_jlink_installed())
}

#[tauri::command]
async fn select_firmware_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let file_path = app
        .dialog()
        .file()
        .add_filter("Hex files", &["hex"])
        .add_filter("All files", &["*"])
        .blocking_pick_file();

    match file_path {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
async fn select_firmware_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let folder = app
        .dialog()
        .file()
        .blocking_pick_folder();

    match folder {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
async fn list_hex_files(path: String) -> Result<Vec<String>, String> {
    let dir = std::fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut result = Vec::new();
    for entry in dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name.to_lowercase().ends_with(".hex") {
            result.push(file_name);
        }
    }
    result.sort();
    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Поиск JLink выполняется один раз при запуске программы
    initialize_jlink_path();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            run_program,
            jlink_reset,
            jlink_pin_reset,
            jlink_erase_all,
            jlink_program,
            jlink_execute_commands,
            jlink_is_installed,
            select_firmware_file,
            select_firmware_folder,
            list_hex_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Windows kernel32 API bindings used only on Windows
#[cfg(target_os = "windows")]
mod windows_kernel32 {
    #[link(name = "kernel32")]
    extern "system" {
        pub fn GetShortPathNameW(
            lpszLongPath: *const u16,
            lpszShortPath: *mut u16,
            cchBuffer: u32,
        ) -> u32;
    }
}