import { useEffect, useState } from "react";
import type { CaptureResult } from "../lib/capture";
import { loadCapturePreview } from "../lib/capture";
import type { OcrResult } from "../lib/ocr";

interface CaptureResultPageProps {
  captureResult: CaptureResult;
  ocrResult: OcrResult | null;
  isRunningOcr: boolean;
  notice: string | null;
  error: string | null;
  onBackHome: () => void;
  onStartCapture: () => Promise<void>;
  onRunOcr: (imagePath: string) => Promise<void>;
  onCopyExtractedText: (text: string) => Promise<void>;
}

export default function CaptureResultPage({
  captureResult,
  ocrResult,
  isRunningOcr,
  notice,
  error,
  onBackHome,
  onStartCapture,
  onRunOcr,
  onCopyExtractedText,
}: CaptureResultPageProps) {
  const ocrStatusLabel = ocrResult ? ocrResult.status : "not-run";
  const extractedText = ocrResult?.text ?? "";
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      try {
        const dataUrl = await loadCapturePreview(captureResult.imagePath);

        if (!cancelled) {
          setPreviewSrc(dataUrl);
          setPreviewError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the capture preview.";

          setPreviewSrc(null);
          setPreviewError(message);
        }
      }
    };

    setPreviewSrc(null);
    setPreviewError(null);
    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [captureResult.imagePath]);

  return (
    <div className="page">
      <section className="panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">Capture Result</p>
            <h1>Capture succeeded</h1>
            <p className="muted">
              Milestone 2 keeps OCR separate from capture and now runs text
              extraction automatically after each saved image.
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
            {previewSrc ? (
              <img src={previewSrc} alt="Captured screen region preview" />
            ) : previewError ? (
              <div className="preview-fallback">
                <p>Preview failed to load.</p>
                <p className="muted">{previewError}</p>
              </div>
            ) : (
              <div className="preview-fallback">
                <p>Loading preview...</p>
              </div>
            )}
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
            <div>
              <dt>OCR status</dt>
              <dd>{ocrStatusLabel}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">OCR</p>
            <h2>Extracted Text</h2>
            <p className="muted">
              The OCR engine is selected from Settings and runs entirely on the
              Rust side. Use retry if you want to run extraction again on the
              same image.
            </p>
          </div>

          <div className="panel-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => void onRunOcr(captureResult.imagePath)}
              disabled={isRunningOcr}
            >
              {isRunningOcr
                ? "Running OCR..."
                : ocrResult
                  ? "Retry OCR"
                  : "Run OCR"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => void onCopyExtractedText(extractedText)}
              disabled={!extractedText}
            >
              Copy extracted text
            </button>
          </div>
        </div>

        <dl className="detail-list ocr-meta">
          <div>
            <dt>Engine</dt>
            <dd>{ocrResult?.engine ?? "not-run"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{ocrStatusLabel}</dd>
          </div>
        </dl>

        {ocrResult?.error ? <p className="message error">{ocrResult.error}</p> : null}

        {extractedText ? (
          <pre className="ocr-output">{extractedText}</pre>
        ) : (
          <div className="empty-state">
            <p>
              {ocrResult?.status === "failed"
                ? "OCR did not return any text."
                : "OCR starts automatically after capture. Use retry if you want to run it again."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
