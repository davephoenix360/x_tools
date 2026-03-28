use std::{io::ErrorKind, path::Path, process::Command};

pub fn recognize(image_path: &Path) -> Result<String, String> {
  let output = Command::new("tesseract")
    .arg(image_path)
    .arg("stdout")
    .arg("--psm")
    .arg("6")
    .output()
    .map_err(|error| {
      if error.kind() == ErrorKind::NotFound {
        "The `tesseract` executable was not found on PATH. Install Tesseract OCR and select the Tesseract engine in Settings."
          .to_string()
      } else {
        format!("Failed to launch Tesseract OCR: {error}")
      }
    })?;

  if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    return Err(if stderr.is_empty() {
      format!("Tesseract OCR exited with status {}.", output.status)
    } else {
      format!("Tesseract OCR failed: {stderr}")
    });
  }

  let text = String::from_utf8(output.stdout)
    .map_err(|error| format!("Tesseract returned invalid UTF-8 output: {error}"))?;

  let normalized_text = text.replace("\r\n", "\n").trim().to_string();

  if normalized_text.is_empty() {
    return Err("OCR completed, but no text was recognized in the captured image.".to_string());
  }

  Ok(normalized_text)
}
