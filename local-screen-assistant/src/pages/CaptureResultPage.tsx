import type { CaptureResult } from "../lib/capture";
import { toCapturePreviewSrc } from "../lib/capture";

interface CaptureResultPageProps {
  captureResult: CaptureResult;
  notice: string | null;
  error: string | null;
  onBackHome: () => void;
  onStartCapture: () => Promise<void>;
}

export default function CaptureResultPage({
  captureResult,
  notice,
  error,
  onBackHome,
  onStartCapture,
}: CaptureResultPageProps) {
  return (
    <div className="page">
      <section className="panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">Capture Result</p>
            <h1>Capture succeeded</h1>
            <p className="muted">
              Milestone 1 stores the selected screen region as a temporary PNG
              and exposes it to the app for the next milestone.
            </p>
          </div>

          <div className="panel-actions">
            <button className="secondary-button" type="button" onClick={onBackHome}>
              Back home
            </button>
            <button className="primary-button" type="button" onClick={() => void onStartCapture()}>
              Capture again
            </button>
          </div>
        </div>

        {notice ? <p className="message success">{notice}</p> : null}
        {error ? <p className="message error">{error}</p> : null}

        <div className="result-layout">
          <div className="result-preview">
            <img
              src={toCapturePreviewSrc(captureResult.imagePath)}
              alt="Captured screen region preview"
            />
          </div>

          <dl className="detail-list result-meta">
            <div>
              <dt>Status</dt>
              <dd>{captureResult.status}</dd>
            </div>
            <div>
              <dt>Temporary file path</dt>
              <dd className="path-value">{captureResult.imagePath}</dd>
            </div>
            <div>
              <dt>Image size</dt>
              <dd>
                {captureResult.width} x {captureResult.height}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
