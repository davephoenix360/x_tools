use tauri::{
  menu::{MenuBuilder, MenuItemBuilder},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  App, AppHandle, Manager,
};

const MAIN_WINDOW_LABEL: &str = "main";
const MENU_SHOW_WINDOW: &str = "show-window";
const MENU_HIDE_WINDOW: &str = "hide-window";
const MENU_QUIT_APP: &str = "quit-app";

pub fn create_tray(app: &App) -> tauri::Result<()> {
  let show_window = MenuItemBuilder::with_id(MENU_SHOW_WINDOW, "Show window").build(app)?;
  let hide_window = MenuItemBuilder::with_id(MENU_HIDE_WINDOW, "Hide window").build(app)?;
  let quit_app = MenuItemBuilder::with_id(MENU_QUIT_APP, "Quit app").build(app)?;

  let tray_menu = MenuBuilder::new(app)
    .item(&show_window)
    .item(&hide_window)
    .item(&quit_app)
    .build()?;

  TrayIconBuilder::with_id("main-tray")
    .menu(&tray_menu)
    .show_menu_on_left_click(false)
    .on_menu_event(|app, event| match event.id.as_ref() {
      MENU_SHOW_WINDOW => show_main_window(app),
      MENU_HIDE_WINDOW => hide_main_window(app),
      MENU_QUIT_APP => app.exit(0),
      _ => {}
    })
    .on_tray_icon_event(|tray, event| {
      if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
      } = event
      {
        show_main_window(&tray.app_handle());
      }
    })
    .build(app)?;

  Ok(())
}

pub fn show_main_window(app: &AppHandle) {
  let app_handle = app.clone();

  let _ = app.run_on_main_thread(move || {
    if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
      let _ = window.show();
      let _ = window.unminimize();
      let _ = window.set_focus();
    }
  });
}

pub fn hide_main_window(app: &AppHandle) {
  let app_handle = app.clone();

  let _ = app.run_on_main_thread(move || {
    if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
      let _ = window.hide();
    }
  });
}
