use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

const SETTINGS_FILE_NAME: &str = "settings.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum OcrEngine {
  WindowsNative,
  Tesseract,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ModelMode {
  Local,
  Cloud,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
  pub source_folders: Vec<String>,
  pub hotkey: String,
  pub ocr_engine: OcrEngine,
  pub model_mode: ModelMode,
  pub launch_on_startup: bool,
}

impl Default for Settings {
  fn default() -> Self {
    Self {
      source_folders: Vec::new(),
      hotkey: "Ctrl+Shift+Space".to_string(),
      ocr_engine: OcrEngine::WindowsNative,
      model_mode: ModelMode::Local,
      launch_on_startup: false,
    }
  }
}

pub fn load_settings(app: &AppHandle) -> Result<Settings, String> {
  let settings_path = settings_file_path(app)?;

  if !settings_path.exists() {
    return Ok(Settings::default());
  }

  let raw_settings = fs::read_to_string(&settings_path)
    .map_err(|error| format!("Failed to read settings from disk: {error}"))?;

  if raw_settings.trim().is_empty() {
    return Ok(Settings::default());
  }

  serde_json::from_str(&raw_settings)
    .map_err(|error| format!("Failed to parse settings JSON: {error}"))
}

pub fn save_settings(app: &AppHandle, settings: &Settings) -> Result<Settings, String> {
  let settings_path = settings_file_path(app)?;

  if let Some(parent_directory) = settings_path.parent() {
    fs::create_dir_all(parent_directory)
      .map_err(|error| format!("Failed to create settings directory: {error}"))?;
  }

  let serialized_settings = serde_json::to_string_pretty(settings)
    .map_err(|error| format!("Failed to serialize settings: {error}"))?;

  fs::write(&settings_path, serialized_settings)
    .map_err(|error| format!("Failed to persist settings: {error}"))?;

  Ok(settings.clone())
}

fn settings_file_path(app: &AppHandle) -> Result<PathBuf, String> {
  let app_config_directory = app
    .path()
    .app_config_dir()
    .map_err(|error| format!("Failed to resolve app config directory: {error}"))?;

  Ok(app_config_directory.join(SETTINGS_FILE_NAME))
}

