import type { CaptureResult } from "../lib/capture";
import type { Settings } from "../lib/settings";

interface HomePageProps {
  settings: Settings;
  isLoading: boolean;
  isStartingCapture: boolean;
  notice: string | null;
  error: string | null;
  latestCapture: CaptureResult | null;
  onStartCapture: () => Promise<void>;
  onOpenLatestCapture: () => void;
}

export default function HomePage({
  settings,
  isLoading,
  isStartingCapture,
  notice,
  error,
  latestCapture,
  onStartCapture,
  onOpenLatestCapture,
}: HomePageProps) {
  const sourceFolderCount = settings.sourceFolders.filter(Boolean).length;

  return (
    <div className="page">
      <section className="panel hero-panel">
        <p className="eyebrow">Milestone 2</p>
        <h1>Local Screen Assistant</h1>
        <p className="muted">
          The desktop shell now supports a global hotkey, fullscreen region
          selection, temporary image capture, and OCR extraction review without
          stepping into retrieval or answer generation yet.
        </p>

        <div className="panel-actions top-gap">
          <button
            className="primary-button"
            type="button"
            onClick={() => void onStartCapture()}
            disabled={isStartingCapture}
          >
            {isStartingCapture ? "Launching capture..." : "Start capture"}
          </button>

          {latestCapture ? (
            <button
              className="secondary-button"
              type="button"
              onClick={onOpenLatestCapture}
            >
              View latest result
            </button>
          ) : null}
        </div>

        {notice ? <p className="message success top-gap">{notice}</p> : null}
        {error ? <p className="message error top-gap">{error}</p> : null}
      </section>

      <div className="panel-grid">
        <section className="panel">
          <h2>Current Shell Status</h2>
          <dl className="detail-list">
            <div>
              <dt>Settings storage</dt>
              <dd>JSON-backed Rust persistence</dd>
            </div>
            <div>
              <dt>Tray lifecycle</dt>
              <dd>Show, hide, and quit actions wired</dd>
            </div>
            <div>
              <dt>Global hotkeys</dt>
              <dd>Registered from persisted settings</dd>
            </div>
            <div>
              <dt>Capture flow</dt>
              <dd>Region selection saves a temp PNG</dd>
            </div>
            <div>
              <dt>OCR</dt>
              <dd>Manual extraction from the result view</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <h2>Configured Defaults</h2>
          {isLoading ? (
            <p className="muted">Loading persisted settings...</p>
          ) : (
            <dl className="detail-list">
              <div>
                <dt>Source folders</dt>
                <dd>{sourceFolderCount}</dd>
              </div>
              <div>
                <dt>Hotkey</dt>
                <dd>{settings.hotkey}</dd>
              </div>
              <div>
                <dt>OCR engine</dt>
                <dd>{settings.ocrEngine}</dd>
              </div>
              <div>
                <dt>Model mode</dt>
                <dd>{settings.modelMode}</dd>
              </div>
              <div>
                <dt>Latest capture</dt>
                <dd>{latestCapture ? latestCapture.imagePath : "None yet"}</dd>
              </div>
            </dl>
          )}
        </section>
      </div>
    </div>
  );
}
