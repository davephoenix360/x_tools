#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod capture;
mod hotkeys;
mod settings;
mod tray;

fn main() {
  tauri::Builder::default()
    .manage(capture::CaptureState::default())
    .plugin(
      tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, _, event| {
          hotkeys::handle_shortcut_event(app, event.state());
        })
        .build(),
    )
    .setup(|app| {
      tray::create_tray(app)?;
      hotkeys::initialize(&app.handle())
        .map_err(std::io::Error::other)?;
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::capture_commands::start_capture,
      commands::capture_commands::cancel_capture,
      commands::capture_commands::complete_capture,
      commands::settings_commands::get_settings,
      commands::settings_commands::save_settings
    ])
    .on_window_event(|window, event| {
      if window.label() != "main" {
        return;
      }

      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window.hide();
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running local-screen-assistant");
}
