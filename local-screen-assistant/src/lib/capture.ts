import { convertFileSrc, invoke } from "@tauri-apps/api/core";

export const CAPTURE_RESULT_EVENT = "capture/result";
export const CAPTURE_CANCELLED_EVENT = "capture/cancelled";
export const CAPTURE_ERROR_EVENT = "capture/error";

export interface CaptureResult {
  status: string;
  imagePath: string;
  width: number;
  height: number;
}

export interface CaptureMessage {
  message: string;
}

export interface CompleteCaptureRequest {
  windowLabel: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureOverlayBootstrap {
  windowLabel: string;
  width: number;
  height: number;
  scaleFactor: number;
}

export async function startCapture(): Promise<void> {
  await invoke("start_capture");
}

export async function cancelCapture(): Promise<void> {
  await invoke("cancel_capture");
}

export async function completeCapture(
  request: CompleteCaptureRequest,
): Promise<CaptureResult> {
  return invoke<CaptureResult>("complete_capture", { request });
}

export function toCapturePreviewSrc(imagePath: string): string {
  return convertFileSrc(imagePath);
}
