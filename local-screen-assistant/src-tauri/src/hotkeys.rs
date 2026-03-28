use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::{
  capture,
  settings::{self, Settings},
};

pub fn initialize(app: &AppHandle) -> Result<(), String> {
  let persisted_settings = settings::load_settings(app).unwrap_or_default();

  match register_hotkey(app, &persisted_settings.hotkey) {
    Ok(()) => Ok(()),
    Err(_) => register_hotkey(app, &Settings::default().hotkey),
  }
}

pub fn validate_shortcut(hotkey: &str) -> Result<(), String> {
  parse_shortcut(hotkey).map(|_| ())
}

pub fn reload_for_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
  let shortcut = parse_shortcut(&settings.hotkey)?;

  app
    .global_shortcut()
    .unregister_all()
    .map_err(|error| format!("Failed to clear the previous global hotkey: {error}"))?;

  app
    .global_shortcut()
    .register(shortcut)
    .map_err(|error| format!("Failed to register the configured global hotkey: {error}"))
}

pub fn handle_shortcut_event(app: &AppHandle, shortcut_state: ShortcutState) {
  if shortcut_state != ShortcutState::Pressed {
    return;
  }

  if let Err(error) = capture::start_capture(app) {
    capture::report_capture_error(app, &error);
  }
}

fn register_hotkey(app: &AppHandle, hotkey: &str) -> Result<(), String> {
  let shortcut = parse_shortcut(hotkey)?;

  app
    .global_shortcut()
    .register(shortcut)
    .map_err(|error| format!("Failed to register the configured global hotkey: {error}"))
}

fn parse_shortcut(hotkey: &str) -> Result<Shortcut, String> {
  hotkey
    .trim()
    .parse::<Shortcut>()
    .map_err(|error| format!("Invalid hotkey `{hotkey}`: {error}"))
}
