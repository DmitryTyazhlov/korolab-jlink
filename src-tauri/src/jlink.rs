use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::sync::OnceLock;
use std::thread;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

static JLINK_EXE_PATH: OnceLock<String> = OnceLock::new();

/// Выполняет поиск JLink и сохраняет путь в глобальный статик.
/// Вызывается один раз — при первом обращении.
fn find_jlink_executable() -> &'static str {
    JLINK_EXE_PATH.get_or_init(|| {
        let possible_names = if cfg!(target_os = "windows") {
            vec!["JLink.exe", "jlink.exe"]
        } else {
            vec!["JLinkExe", "JLink", "jlink"]
        };

        // First try to find in common installation directories dynamically
        let mut common_paths = Vec::new();
        if cfg!(target_os = "windows") {
            if let Ok(entries) = std::fs::read_dir("C:\\Program Files\\SEGGER") {
                for entry in entries.flatten() {
                    if let Ok(file_type) = entry.file_type() {
                        if file_type.is_dir() {
                            if let Some(dir_name) = entry.file_name().to_str() {
                                if dir_name.starts_with("JLink") {
                                    let exe_path = entry.path().join("JLink.exe");
                                    if exe_path.exists() {
                                        common_paths.push(exe_path.to_string_lossy().to_string());
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if let Ok(entries) = std::fs::read_dir("C:\\Program Files (x86)\\SEGGER") {
                for entry in entries.flatten() {
                    if let Ok(file_type) = entry.file_type() {
                        if file_type.is_dir() {
                            if let Some(dir_name) = entry.file_name().to_str() {
                                if dir_name.starts_with("JLink") {
                                    let exe_path = entry.path().join("JLink.exe");
                                    if exe_path.exists() {
                                        common_paths.push(exe_path.to_string_lossy().to_string());
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // For Unix-like systems, keep some common paths
            common_paths = vec![
                "/Applications/SEGGER/JLink/JLinkExe".to_string(),
                "/usr/local/bin/JLinkExe".to_string(),
                "/opt/SEGGER/JLink/JLinkExe".to_string(),
            ];
        };

        for path in &common_paths {
            if is_segger_jlink(path) {
                return path.to_string();
            }
        }

        // Then try PATH, but verify it's Segger JLink
        for name in &possible_names {
            if is_segger_jlink(name) {
                return name.to_string();
            }
        }

        // Fallback to default name
        possible_names[0].to_string()
    })
}

fn is_segger_jlink(path: &str) -> bool {
    let mut command = Command::new(path);
    command.arg("-help");

    #[cfg(target_os = "windows")]
    {
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    if let Ok(output) = command.output() {
        let help_text = String::from_utf8_lossy(&output.stdout);
        // Check if it's Segger JLink by looking for specific text in help
        help_text.contains("SEGGER")
            || help_text.contains("J-Link")
            || help_text.contains("JLink")
    } else {
        false
    }
}

/// Выполнить поиск JLink.exe принудительно (можно вызвать при старте).
/// Если результат уже найден — не делает ничего.
pub fn initialize_jlink_path() {
    find_jlink_executable();
}

/// Возвращает путь к JLink (после вызова `initialize_jlink_path`).
/// Если поиск ещё не выполнялся — запускает его.
pub fn get_jlink_path() -> &'static str {
    find_jlink_executable()
}

#[derive(Serialize, Deserialize)]
pub struct JLinkResult {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

pub struct JLink {
    default_options: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ConnectionParams {
    pub connection_type: String,
    pub device: String,
    pub ip: Option<String>,
    pub remote_id: Option<String>,
}

impl JLink {
    pub fn new(device: &str) -> Self {
        // Поиск происходит один раз (глобальный OnceLock)
        find_jlink_executable();

        Self {
            default_options: vec![
                "-device".to_string(),
                device.to_string(),
                "-if".to_string(),
                "swd".to_string(),
                "-speed".to_string(),
                "4000".to_string(),
            ],
        }
    }

    fn prepare_command(&self) -> Command {
        let mut command = Command::new(get_jlink_path());
        command
            .args(&self.default_options)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        {
            command.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        command
    }

    pub fn with_connection_params(mut self, params: &ConnectionParams) -> Self {
        match params.connection_type.as_str() {
            "usb" => {
                // USB is default, no additional options needed
            }
            "local" => {
                if let Some(ip) = &params.ip {
                    self.default_options.push("-IP".to_string());
                    self.default_options.push(ip.clone());
                }
            }
            "remote" => {
                if let Some(remote_id) = &params.remote_id {
                    self.default_options.push("-IP".to_string());
                    self.default_options
                        .push(format!("tunnel:{}::jlink-europe.segger.com", remote_id));
                }
            }
            _ => {}
        }
        self
    }

    pub fn execute_commands_stream<F>(
        &self,
        commands: &[String],
        mut on_output: F,
    ) -> Result<JLinkResult, String>
    where
        F: FnMut(&str, &str),
    {
        let mut child = self
            .prepare_command()
            .spawn()
            .map_err(|e| format!("Failed to spawn {}: {}", get_jlink_path(), e))?;

        if let Some(mut stdin) = child.stdin.take() {
            for command in commands {
                writeln!(stdin, "{}", command)
                    .map_err(|e| format!("Failed to write command: {}", e))?;
            }
            writeln!(stdin, "exit").map_err(|e| format!("Failed to write exit: {}", e))?;
        }

        let stdout_reader = child
            .stdout
            .take()
            .ok_or_else(|| "Failed to capture stdout".to_string())?;
        let stderr_reader = child
            .stderr
            .take()
            .ok_or_else(|| "Failed to capture stderr".to_string())?;

        let (tx, rx) = mpsc::channel::<(String, String)>();
        let stdout_tx = tx.clone();
        let stderr_tx = tx.clone();

        let stdout_handle = thread::spawn(move || {
            let mut reader = BufReader::new(stdout_reader);
            let mut buffer = Vec::new();

            while let Ok(bytes_read) = reader.read_until(b'\n', &mut buffer) {
                if bytes_read == 0 {
                    break;
                }
                let text = String::from_utf8_lossy(&buffer).to_string();
                if stdout_tx.send(("stdout".to_string(), text)).is_err() {
                    break;
                }
                buffer.clear();
            }
        });

        let stderr_handle = thread::spawn(move || {
            let mut reader = BufReader::new(stderr_reader);
            let mut buffer = Vec::new();

            while let Ok(bytes_read) = reader.read_until(b'\n', &mut buffer) {
                if bytes_read == 0 {
                    break;
                }
                let text = String::from_utf8_lossy(&buffer).to_string();
                if stderr_tx.send(("stderr".to_string(), text)).is_err() {
                    break;
                }
                buffer.clear();
            }
        });

        let status = child
            .wait()
            .map_err(|e| format!("Failed to wait for {}: {}", get_jlink_path(), e))?;

        drop(tx);

        let mut stdout = String::new();
        let mut stderr = String::new();

        for (stream, text) in rx {
            if stream == "stdout" {
                stdout.push_str(&text);
            } else {
                stderr.push_str(&text);
            }
            on_output(&stream, &text);
        }

        let _ = stdout_handle.join();
        let _ = stderr_handle.join();

        let code = status.code().unwrap_or(-1);

        Ok(JLinkResult {
            stdout,
            stderr,
            code,
        })
    }

    pub fn is_jlink_installed(&self) -> bool {
        Command::new(get_jlink_path()).arg("-help").output().is_ok()
    }
}