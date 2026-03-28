import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { cancelCapture, completeCapture } from "../lib/capture";

interface Point {
  x: number;
  y: number;
}

export default function CaptureOverlayPage() {
  const overlay = window.__LOCAL_SCREEN_ASSISTANT_CAPTURE_OVERLAY__;
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("overlay-html");
    document.body.classList.add("overlay-body");
    return () => {
      document.documentElement.classList.remove("overlay-html");
      document.body.classList.remove("overlay-body");
    };
  }, []);

  const selection = useMemo(() => {
    if (!dragStart || !dragCurrent) {
      return null;
    }

    const left = Math.min(dragStart.x, dragCurrent.x);
    const top = Math.min(dragStart.y, dragCurrent.y);
    const width = Math.abs(dragStart.x - dragCurrent.x);
    const height = Math.abs(dragStart.y - dragCurrent.y);

    return { left, top, width, height };
  }, [dragCurrent, dragStart]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void handleCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!overlay) {
    return (
      <div className="capture-overlay-page">
        <div className="capture-overlay-banner error">
          Capture overlay initialization failed. Close this window and try again.
        </div>
      </div>
    );
  }

  const scaleFactor = overlay.scaleFactor || window.devicePixelRatio || 1;

  const handleCancel = async () => {
    if (isSubmitting) {
      return;
    }

    try {
      await cancelCapture();
    } catch (cancelError) {
      const message =
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to cancel the current capture.";

      setLocalError(message);
    }
  };

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || isSubmitting) {
      return;
    }

    setLocalError(null);

    const point = { x: event.clientX, y: event.clientY };
    setDragStart(point);
    setDragCurrent(point);
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragStart || isSubmitting) {
      return;
    }

    setDragCurrent({ x: event.clientX, y: event.clientY });
  };

  const handleMouseUp = async (event: MouseEvent<HTMLDivElement>) => {
    if (!dragStart || isSubmitting) {
      return;
    }

    const endPoint = { x: event.clientX, y: event.clientY };
    const left = Math.min(dragStart.x, endPoint.x);
    const top = Math.min(dragStart.y, endPoint.y);
    const width = Math.abs(dragStart.x - endPoint.x);
    const height = Math.abs(dragStart.y - endPoint.y);

    setDragStart(null);
    setDragCurrent(null);

    if (width < 3 || height < 3) {
      setLocalError("Drag a larger rectangle or press Escape to cancel.");
      return;
    }

    setIsSubmitting(true);

    try {
      await completeCapture({
        windowLabel: overlay.windowLabel,
        x: Math.round(left * scaleFactor),
        y: Math.round(top * scaleFactor),
        width: Math.round(width * scaleFactor),
        height: Math.round(height * scaleFactor),
      });
    } catch (captureError) {
      const message =
        captureError instanceof Error
          ? captureError.message
          : "Unable to capture the selected region.";

      setLocalError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="capture-overlay-page"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(event) => {
        event.preventDefault();
        void handleCancel();
      }}
    >
      <div className="capture-overlay-banner">
        <p>Drag to capture a region.</p>
        <p className="muted">Press Escape or right-click to cancel.</p>
        {localError ? <p className="overlay-error">{localError}</p> : null}
      </div>

      {selection ? (
        <div
          className="capture-selection"
          style={{
            left: `${selection.left}px`,
            top: `${selection.top}px`,
            width: `${selection.width}px`,
            height: `${selection.height}px`,
          }}
        />
      ) : null}
    </div>
  );
}
