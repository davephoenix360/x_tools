import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  CAPTURE_CANCELLED_EVENT,
  CAPTURE_ERROR_EVENT,
  CAPTURE_RESULT_EVENT,
  startCapture,
  type CaptureMessage,
  type CaptureResult,
} from "./lib/capture";
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestCapture, setLatestCapture] = useState<CaptureResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const persistedSettings = await getSettings();

        if (!cancelled) {
          setSettings(persistedSettings);
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
    let unlistenResult: (() => void) | null = null;
    let unlistenCancelled: (() => void) | null = null;
    let unlistenError: (() => void) | null = null;

    const attachListeners = async () => {
      unlistenResult = await listen<CaptureResult>(CAPTURE_RESULT_EVENT, (event) => {
        setLatestCapture(event.payload);
        setFeedback("Capture completed and stored in a temporary file.");
        setError(null);
        setRoute("capture-result");
        setIsStartingCapture(false);
      });

      unlistenCancelled = await listen<CaptureMessage>(
        CAPTURE_CANCELLED_EVENT,
        (event) => {
          setFeedback(event.payload.message);
          setError(null);
          setRoute("home");
          setIsStartingCapture(false);
        },
      );

      unlistenError = await listen<CaptureMessage>(CAPTURE_ERROR_EVENT, (event) => {
        setError(event.payload.message);
        setFeedback(null);
        setRoute("home");
        setIsStartingCapture(false);
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Local Screen Assistant</p>
          <h1 className="sidebar-title">Desktop Shell</h1>
          <p className="muted">
            Milestone 1 adds capture launch, region selection, and a placeholder
            result state.
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
            notice={feedback}
            error={error}
            onBackHome={() => setRoute("home")}
            onStartCapture={handleStartCapture}
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
