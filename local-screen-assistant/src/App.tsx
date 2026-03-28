import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  CAPTURE_CANCELLED_EVENT,
  CAPTURE_ERROR_EVENT,
  CAPTURE_RESULT_EVENT,
  getLatestCapture,
  startCapture,
  type CaptureMessage,
  type CaptureResult,
} from "./lib/capture";
import { runOcr, type OcrResult } from "./lib/ocr";
import { defaultSettings, getSettings, saveSettings, type Settings } from "./lib/settings";
import CaptureOverlayPage from "./pages/CaptureOverlayPage";
import CaptureResultPage from "./pages/CaptureResultPage";
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";

type Route = "home" | "settings" | "capture-result";

const isCaptureOverlayWindow =
  typeof window !== "undefined" &&
  Boolean(window.__LOCAL_SCREEN_ASSISTANT_CAPTURE_OVERLAY__);

export default function App() {
  if (isCaptureOverlayWindow) {
    return <CaptureOverlayPage />;
  }

  const [route, setRoute] = useState<Route>("home");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isStartingCapture, setIsStartingCapture] = useState(false);
  const [isRunningOcr, setIsRunningOcr] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestCapture, setLatestCapture] = useState<CaptureResult | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const ocrRequestIdRef = useRef(0);

  const runOcrForCapture = async (imagePath: string, automatic = false) => {
    const requestId = ocrRequestIdRef.current + 1;
    ocrRequestIdRef.current = requestId;

    setIsRunningOcr(true);
    setError(null);
    setFeedback(
      automatic ? "Capture completed. Running OCR automatically..." : null,
    );

    try {
      const result = await runOcr(imagePath);

      if (ocrRequestIdRef.current !== requestId) {
        return;
      }

      setOcrResult(result);

      if (result.status === "succeeded") {
        setFeedback("OCR completed.");
      } else if (automatic) {
        setFeedback("Capture completed. OCR finished with an error.");
      }
    } catch (ocrError) {
      if (ocrRequestIdRef.current !== requestId) {
        return;
      }

      const message =
        ocrError instanceof Error
          ? ocrError.message
          : "Unable to run OCR on the captured image.";

      setError(message);
      setFeedback(null);
    } finally {
      if (ocrRequestIdRef.current === requestId) {
        setIsRunningOcr(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const persistedSettings = await getSettings();
        const latestCaptureResult = await getLatestCapture();

        if (!cancelled) {
          setSettings(persistedSettings);

          if (latestCaptureResult) {
            setLatestCapture(latestCaptureResult);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : "Unable to load persisted settings.";

          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncLatestCapture = async () => {
      try {
        const latestCaptureResult = await getLatestCapture();

        if (
          latestCaptureResult &&
          latestCaptureResult.imagePath !== latestCapture?.imagePath
        ) {
          setLatestCapture(latestCaptureResult);
          setOcrResult(null);
          setFeedback("Capture completed. Running OCR automatically...");
          setError(null);
          setRoute("capture-result");
          void runOcrForCapture(latestCaptureResult.imagePath, true);
        }
      } catch {
        // Ignore fallback sync errors and keep the event-driven path primary.
      }
    };

    const handleFocus = () => {
      void syncLatestCapture();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [latestCapture?.imagePath]);

  useEffect(() => {
    let unlistenResult: (() => void) | null = null;
    let unlistenCancelled: (() => void) | null = null;
    let unlistenError: (() => void) | null = null;

    const attachListeners = async () => {
      unlistenResult = await listen<CaptureResult>(CAPTURE_RESULT_EVENT, (event) => {
        setLatestCapture(event.payload);
        setOcrResult(null);
        setError(null);
        setRoute("capture-result");
        setIsStartingCapture(false);
        void runOcrForCapture(event.payload.imagePath, true);
      });

      unlistenCancelled = await listen<CaptureMessage>(
        CAPTURE_CANCELLED_EVENT,
        (event) => {
          ocrRequestIdRef.current += 1;
          setFeedback(event.payload.message);
          setError(null);
          setRoute("home");
          setIsStartingCapture(false);
          setIsRunningOcr(false);
        },
      );

      unlistenError = await listen<CaptureMessage>(CAPTURE_ERROR_EVENT, (event) => {
        ocrRequestIdRef.current += 1;
        setError(event.payload.message);
        setFeedback(null);
        setRoute("home");
        setIsStartingCapture(false);
        setIsRunningOcr(false);
      });
    };

    void attachListeners();

    return () => {
      unlistenResult?.();
      unlistenCancelled?.();
      unlistenError?.();
    };
  }, []);

  const handleSave = async (nextSettings: Settings) => {
    setIsSaving(true);
    setFeedback(null);
    setError(null);

    try {
      const persistedSettings = await saveSettings(nextSettings);
      setSettings(persistedSettings);
      setFeedback("Settings saved locally.");
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Unable to save settings.";

      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartCapture = async () => {
    setIsStartingCapture(true);
    setFeedback(null);
    setError(null);

    try {
      await startCapture();
    } catch (captureError) {
      const message =
        captureError instanceof Error
          ? captureError.message
          : "Unable to start the capture overlay.";

      setError(message);
      setIsStartingCapture(false);
    }
  };

  const handleRunOcr = async (imagePath: string) => {
    await runOcrForCapture(imagePath);
  };

  const handleCopyExtractedText = async (text: string) => {
    if (!text) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setFeedback("Extracted text copied to clipboard.");
      setError(null);
    } catch (copyError) {
      const message =
        copyError instanceof Error
          ? copyError.message
          : "Unable to copy the extracted text.";

      setError(message);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Local Screen Assistant</p>
          <h1 className="sidebar-title">Desktop Shell</h1>
          <p className="muted">
            Milestone 2 adds OCR execution and extracted text review on top of
            the capture flow.
          </p>
        </div>

        <nav className="nav-list" aria-label="Primary">
          <button
            className={route === "home" ? "nav-button active" : "nav-button"}
            type="button"
            onClick={() => setRoute("home")}
          >
            Home
          </button>
          <button
            className={route === "settings" ? "nav-button active" : "nav-button"}
            type="button"
            onClick={() => setRoute("settings")}
          >
            Settings
          </button>
          {latestCapture ? (
            <button
              className={route === "capture-result" ? "nav-button active" : "nav-button"}
              type="button"
              onClick={() => setRoute("capture-result")}
            >
              Latest Capture
            </button>
          ) : null}
        </nav>
      </aside>

      <main className="content">
        {route === "home" ? (
          <HomePage
            settings={settings}
            isLoading={isLoading}
            isStartingCapture={isStartingCapture}
            notice={feedback}
            error={error}
            latestCapture={latestCapture}
            onStartCapture={handleStartCapture}
            onOpenLatestCapture={() => setRoute("capture-result")}
          />
        ) : route === "capture-result" && latestCapture ? (
          <CaptureResultPage
            captureResult={latestCapture}
            ocrResult={ocrResult && ocrResult.imagePath === latestCapture.imagePath ? ocrResult : null}
            isRunningOcr={isRunningOcr}
            notice={feedback}
            error={error}
            onBackHome={() => setRoute("home")}
            onStartCapture={handleStartCapture}
            onRunOcr={handleRunOcr}
            onCopyExtractedText={handleCopyExtractedText}
          />
        ) : (
          <SettingsPage
            settings={settings}
            isLoading={isLoading}
            isSaving={isSaving}
            feedback={feedback}
            error={error}
            onSave={handleSave}
          />
        )}
      </main>
    </div>
  );
}
