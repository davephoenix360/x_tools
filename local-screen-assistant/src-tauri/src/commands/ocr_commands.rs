use tauri::AppHandle;

use crate::ocr::{self, OcrResultPayload};

#[tauri::command]
pub fn run_ocr(app: AppHandle, image_path: String) -> Result<OcrResultPayload, String> {
  Ok(ocr::run_ocr(&app, image_path))
}
