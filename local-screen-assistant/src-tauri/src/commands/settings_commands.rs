use tauri::AppHandle;

use crate::{
  hotkeys,
  settings::{self, Settings},
};

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Settings, String> {
  settings::load_settings(&app)
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: Settings) -> Result<Settings, String> {
  hotkeys::validate_shortcut(&settings.hotkey)?;

  let previous_settings = settings::load_settings(&app).unwrap_or_default();
  let persisted_settings = settings::save_settings(&app, &settings)?;

  if let Err(error) = hotkeys::reload_for_settings(&app, &persisted_settings) {
    let _ = settings::save_settings(&app, &previous_settings);
    let _ = hotkeys::reload_for_settings(&app, &previous_settings);

    return Err(format!("Failed to refresh hotkeys: {error}"));
  }

  Ok(persisted_settings)
}
