use std::{
  fs,
  sync::Mutex,
  thread,
  time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::{
  AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};
use xcap::Monitor;

use crate::tray;

const MAIN_WINDOW_LABEL: &str = "main";
const OVERLAY_LABEL_PREFIX: &str = "capture-overlay";
const CAPTURE_STABILIZE_DELAY_MS: u64 = 120;
const CAPTURE_TEMP_ROOT: &str = "local-screen-assistant";
const CAPTURE_TEMP_SUBDIRECTORY: &str = "captures";

pub const CAPTURE_RESULT_EVENT: &str = "capture/result";
pub const CAPTURE_CANCELLED_EVENT: &str = "capture/cancelled";
pub const CAPTURE_ERROR_EVENT: &str = "capture/error";

#[derive(Default)]
pub struct CaptureState {
  session: Mutex<CaptureSession>,
}

#[derive(Default)]
struct CaptureSession {
  active: bool,
  overlay_monitors: Vec<OverlayMonitor>,
  restore_main_window: bool,
}

#[derive(Debug, Clone)]
struct OverlayMonitor {
  label: String,
  x: i32,
  y: i32,
  width: u32,
  height: u32,
  scale_factor: f32,
  is_primary: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OverlayBootstrap {
  window_label: String,
  width: u32,
  height: u32,
  scale_factor: f32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureResultPayload {
  pub status: String,
  pub image_path: String,
  pub width: u32,
  pub height: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureMessagePayload {
  pub message: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteCaptureRequest {
  pub window_label: String,
  pub x: u32,
  pub y: u32,
  pub width: u32,
  pub height: u32,
}

pub fn start_capture(app: &AppHandle) -> Result<(), String> {
  let overlay_monitors = load_overlay_monitors()?;
  let restore_main_window = app
    .get_webview_window(MAIN_WINDOW_LABEL)
    .and_then(|window| window.is_visible().ok())
    .unwrap_or(false);

  {
    let state = app.state::<CaptureState>();
    let mut session = state.session.lock().unwrap();

    if session.active {
      return Err("A capture is already in progress.".to_string());
    }

    session.active = true;
    session.overlay_monitors = overlay_monitors.clone();
    session.restore_main_window = restore_main_window;
  }

  if restore_main_window {
    tray::hide_main_window(app);
  }

  let (tx, rx) = std::sync::mpsc::channel();
  let app_handle = app.clone();
  let overlay_monitors_for_windows = overlay_monitors.clone();

  app
    .run_on_main_thread(move || {
      let result = create_overlay_windows(&app_handle, &overlay_monitors_for_windows)
        .map_err(|error| error.to_string());
      let _ = tx.send(result);
    })
    .map_err(|error| format!("Failed to launch the capture overlay: {error}"))?;

  match rx.recv() {
    Ok(Ok(())) => Ok(()),
    Ok(Err(error)) => {
      reset_session(app);

      if restore_main_window {
        tray::show_main_window(app);
      }

      Err(error)
    }
    Err(_) => {
      reset_session(app);

      if restore_main_window {
        tray::show_main_window(app);
      }

      Err("The capture overlay could not be initialized.".to_string())
    }
  }
}

pub fn cancel_capture(app: &AppHandle) -> Result<(), String> {
  let (overlay_labels, restore_main_window) = {
    let state = app.state::<CaptureState>();
    let mut session = state.session.lock().unwrap();

    if !session.active {
      return Ok(());
    }

    let overlay_labels = session
      .overlay_monitors
      .iter()
      .map(|monitor| monitor.label.clone())
      .collect::<Vec<_>>();

    let restore_main_window = session.restore_main_window;

    session.active = false;
    session.overlay_monitors.clear();
    session.restore_main_window = false;

    (overlay_labels, restore_main_window)
  };

  close_overlay_windows(app, &overlay_labels);

  if restore_main_window {
    tray::show_main_window(app);
  }

  let _ = app.emit(
    CAPTURE_CANCELLED_EVENT,
    CaptureMessagePayload {
      message: "Capture canceled.".to_string(),
    },
  );

  Ok(())
}

pub fn complete_capture(
  app: &AppHandle,
  request: CompleteCaptureRequest,
) -> Result<CaptureResultPayload, String> {
  let (selected_monitor, overlay_labels) = {
    let state = app.state::<CaptureState>();
    let session = state.session.lock().unwrap();

    if !session.active {
      return Err("There is no active capture session.".to_string());
    }

    let selected_monitor = session
      .overlay_monitors
      .iter()
      .find(|monitor| monitor.label == request.window_label)
      .cloned()
      .ok_or_else(|| "The selected capture overlay is no longer available.".to_string())?;

    let overlay_labels = session
      .overlay_monitors
      .iter()
      .map(|monitor| monitor.label.clone())
      .collect::<Vec<_>>();

    (selected_monitor, overlay_labels)
  };

  close_overlay_windows(app, &overlay_labels);
  thread::sleep(Duration::from_millis(CAPTURE_STABILIZE_DELAY_MS));

  let capture_result = capture_monitor_region(app, &selected_monitor, &request);
  reset_session(app);

  match capture_result {
    Ok(result) => {
      tray::show_main_window(app);
      let _ = app.emit(CAPTURE_RESULT_EVENT, &result);
      Ok(result)
    }
    Err(error) => {
      report_capture_error(app, &error);
      Err(error)
    }
  }
}

pub fn report_capture_error(app: &AppHandle, message: &str) {
  tray::show_main_window(app);
  let _ = app.emit(
    CAPTURE_ERROR_EVENT,
    CaptureMessagePayload {
      message: message.to_string(),
    },
  );
}

fn load_overlay_monitors() -> Result<Vec<OverlayMonitor>, String> {
  let monitors = Monitor::all()
    .map_err(|error| format!("Unable to enumerate monitors for capture: {error}"))?;

  if monitors.is_empty() {
    return Err("No monitors are available for capture.".to_string());
  }

  monitors
    .into_iter()
    .enumerate()
    .map(|(index, monitor)| {
      Ok(OverlayMonitor {
        label: format!("{OVERLAY_LABEL_PREFIX}-{index}"),
        x: monitor
          .x()
          .map_err(|error| format!("Unable to read monitor position: {error}"))?,
        y: monitor
          .y()
          .map_err(|error| format!("Unable to read monitor position: {error}"))?,
        width: monitor
          .width()
          .map_err(|error| format!("Unable to read monitor width: {error}"))?,
        height: monitor
          .height()
          .map_err(|error| format!("Unable to read monitor height: {error}"))?,
        scale_factor: monitor
          .scale_factor()
          .map_err(|error| format!("Unable to read monitor scale factor: {error}"))?,
        is_primary: monitor
          .is_primary()
          .map_err(|error| format!("Unable to determine the primary monitor: {error}"))?,
      })
    })
    .collect()
}

fn create_overlay_windows(
  app: &AppHandle,
  overlay_monitors: &[OverlayMonitor],
) -> tauri::Result<()> {
  let mut created_labels = Vec::new();

  for overlay_monitor in overlay_monitors {
    let overlay_payload = serde_json::to_string(&OverlayBootstrap {
      window_label: overlay_monitor.label.clone(),
      width: overlay_monitor.width,
      height: overlay_monitor.height,
      scale_factor: overlay_monitor.scale_factor,
    })?;

    let initialization_script = format!(
      "window.__LOCAL_SCREEN_ASSISTANT_CAPTURE_OVERLAY__ = {overlay_payload};"
    );

    let window_result = WebviewWindowBuilder::new(
      app,
      overlay_monitor.label.clone(),
      WebviewUrl::App("index.html".into()),
    )
    .title("Local Screen Assistant Capture")
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .shadow(false)
    .focused(overlay_monitor.is_primary)
    .position(f64::from(overlay_monitor.x), f64::from(overlay_monitor.y))
    .inner_size(
      f64::from(overlay_monitor.width),
      f64::from(overlay_monitor.height),
    )
    .initialization_script(initialization_script)
    .build();

    let window = match window_result {
      Ok(window) => window,
      Err(error) => {
        close_overlay_windows(app, &created_labels);
        return Err(error);
      }
    };

    created_labels.push(overlay_monitor.label.clone());
    let _ = window.set_focus();
  }

  if created_labels.is_empty() {
    return Err(tauri::Error::WindowNotFound);
  }

  Ok(())
}

fn capture_monitor_region(
  app: &AppHandle,
  monitor: &OverlayMonitor,
  request: &CompleteCaptureRequest,
) -> Result<CaptureResultPayload, String> {
  if request.width < 2 || request.height < 2 {
    return Err("Select a larger capture area before releasing the mouse.".to_string());
  }

  if request.x.saturating_add(request.width) > monitor.width
    || request.y.saturating_add(request.height) > monitor.height
  {
    return Err("The selected capture area extends outside the monitor bounds.".to_string());
  }

  let screen = Monitor::from_point(monitor.x + 1, monitor.y + 1)
    .map_err(|error| format!("Unable to find the selected monitor: {error}"))?;

  let image = screen
    .capture_region(request.x, request.y, request.width, request.height)
    .map_err(|error| format!("Unable to capture the selected region: {error}"))?;

  let capture_path = build_capture_path(app)?;
  image
    .save(&capture_path)
    .map_err(|error| format!("Unable to write the capture image: {error}"))?;

  Ok(CaptureResultPayload {
    status: "capture-succeeded".to_string(),
    image_path: capture_path.to_string_lossy().to_string(),
    width: request.width,
    height: request.height,
  })
}

fn build_capture_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
  let capture_root = app
    .path()
    .temp_dir()
    .map_err(|error| format!("Unable to resolve the system temp directory: {error}"))?
    .join(CAPTURE_TEMP_ROOT)
    .join(CAPTURE_TEMP_SUBDIRECTORY);

  fs::create_dir_all(&capture_root)
    .map_err(|error| format!("Unable to create the capture temp directory: {error}"))?;

  let timestamp = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map_err(|error| format!("Unable to create a capture timestamp: {error}"))?
    .as_millis();

  Ok(capture_root.join(format!("capture-{timestamp}.png")))
}

fn close_overlay_windows(app: &AppHandle, overlay_labels: &[String]) {
  for label in overlay_labels {
    if let Some(window) = app.get_webview_window(label) {
      let _ = window.close();
    }
  }
}

fn reset_session(app: &AppHandle) {
  let state = app.state::<CaptureState>();
  let mut session = state.session.lock().unwrap();
  session.active = false;
  session.overlay_monitors.clear();
  session.restore_main_window = false;
}
