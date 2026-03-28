import type { CaptureOverlayBootstrap } from "./lib/capture";

declare global {
  interface Window {
    __LOCAL_SCREEN_ASSISTANT_CAPTURE_OVERLAY__?: CaptureOverlayBootstrap;
  }
}

export {};
