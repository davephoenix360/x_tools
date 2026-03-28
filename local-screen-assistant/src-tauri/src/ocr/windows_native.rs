use std::path::Path;

pub fn recognize(_image_path: &Path) -> Result<String, String> {
  Err(
    "The Windows native OCR backend is not wired yet. Switch the OCR engine to Tesseract to run OCR in Milestone 2."
      .to_string(),
  )
}
