use tauri::AppHandle;

use crate::capture::{self, CaptureResultPayload, CompleteCaptureRequest};

#[tauri::command]
pub fn start_capture(app: AppHandle) -> Result<(), String> {
  capture::start_capture(&app)
}

#[tauri::command]
pub fn cancel_capture(app: AppHandle) -> Result<(), String> {
  capture::cancel_capture(&app)
}

#[tauri::command]
pub fn complete_capture(
  app: AppHandle,
  request: CompleteCaptureRequest,
) -> Result<CaptureResultPayload, String> {
  capture::complete_capture(&app, request)
}

#[tauri::command]
pub fn get_latest_capture(app: AppHandle) -> Result<Option<CaptureResultPayload>, String> {
  Ok(capture::latest_capture(&app))
}

#[tauri::command]
pub fn load_capture_preview(image_path: String) -> Result<String, String> {
  capture::load_capture_preview(&image_path)
}
