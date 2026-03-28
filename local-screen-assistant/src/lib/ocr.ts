import { invoke } from "@tauri-apps/api/core";
import type { OcrEngine } from "./settings";

export type OcrStatus = "succeeded" | "failed";

export interface OcrResult {
  imagePath: string;
  engine: OcrEngine;
  status: OcrStatus;
  text: string;
  error: string | null;
}

export async function runOcr(imagePath: string): Promise<OcrResult> {
  return invoke<OcrResult>("run_ocr", { imagePath });
}
