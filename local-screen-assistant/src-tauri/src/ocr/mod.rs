use std::path::Path;

use serde::Serialize;
use tauri::AppHandle;

use crate::settings::{self, OcrEngine};

pub mod tesseract;
pub mod windows_native;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum OcrStatus {
  Succeeded,
  Failed,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrResultPayload {
  pub image_path: String,
  pub engine: OcrEngine,
  pub status: OcrStatus,
  pub text: String,
  pub error: Option<String>,
}

pub fn run_ocr(app: &AppHandle, image_path: String) -> OcrResultPayload {
  let settings = settings::load_settings(app).unwrap_or_default();
  let engine = settings.ocr_engine.clone();
  let image_path_ref = Path::new(&image_path);

  if !image_path_ref.exists() {
    return OcrResultPayload {
      image_path,
      engine,
      status: OcrStatus::Failed,
      text: String::new(),
      error: Some("The captured image file could not be found.".to_string()),
    };
  }

  let recognition_result = match engine {
    OcrEngine::WindowsNative => windows_native::recognize(image_path_ref),
    OcrEngine::Tesseract => tesseract::recognize(image_path_ref),
  };

  match recognition_result {
    Ok(text) => OcrResultPayload {
      image_path,
      engine,
      status: OcrStatus::Succeeded,
      text,
      error: None,
    },
    Err(error) => OcrResultPayload {
      image_path,
      engine,
      status: OcrStatus::Failed,
      text: String::new(),
      error: Some(error),
    },
  }
}
