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
