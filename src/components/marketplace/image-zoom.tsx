"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 8;

interface View {
  scale: number;
  x: number;
  y: number;
}

/**
 * Fullscreen blueprint viewer (~80% of the screen) with wheel/button zoom and
 * drag-to-pan. Dependency-free: transform is a translate+scale on the <img>.
 * Wheel zoom is anchored at the cursor; buttons zoom about the center.
 */
export function ImageZoom({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<{ sx: number; sy: number; x: number; y: number } | null>(null);

  const clamp = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  // Zoom by `factor` keeping the (clientX, clientY) point fixed on screen.
  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const area = areaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const cx = clientX - rect.left - rect.width / 2;
    const cy = clientY - rect.top - rect.height / 2;
    const { scale, x, y } = viewRef.current;
    const next = clamp(scale * factor);
    if (next === scale) return;
    const ratio = next / scale;
    if (next === 1) {
      setView({ scale: 1, x: 0, y: 0 });
      return;
    }
    setView({ scale: next, x: (x - cx) * ratio + cx, y: (y - cy) * ratio + cy });
  }, []);

  const zoomCenter = (factor: number) => {
    const area = areaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  };

  const reset = () => setView({ scale: 1, x: 0, y: 0 });

  // Escape closes; wheel needs a non-passive listener to call preventDefault.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const area = areaRef.current;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    area?.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.removeEventListener("keydown", onKey);
      area?.removeEventListener("wheel", onWheel);
    };
  }, [onClose, zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (viewRef.current.scale <= 1) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, x: view.x, y: view.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const x = d.x + (e.clientX - d.sx);
    const y = d.y + (e.clientY - d.sy);
    setView((v) => ({ ...v, x, y }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const zoomed = view.scale > 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-lg border border-border bg-background/70 p-1 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <ToolButton label="Zoom out" onClick={() => zoomCenter(1 / 1.3)} disabled={view.scale <= MIN_SCALE}>
          <ZoomOut className="h-5 w-5" />
        </ToolButton>
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(view.scale * 100)}%
        </span>
        <ToolButton label="Zoom in" onClick={() => zoomCenter(1.3)} disabled={view.scale >= MAX_SCALE}>
          <ZoomIn className="h-5 w-5" />
        </ToolButton>
        <ToolButton label="Reset" onClick={reset} disabled={view.scale === 1 && view.x === 0 && view.y === 0}>
          <RotateCcw className="h-5 w-5" />
        </ToolButton>
        <ToolButton label="Close" onClick={onClose}>
          <X className="h-5 w-5" />
        </ToolButton>
      </div>

      {/* Image stage — ~80% of the screen */}
      <div
        ref={areaRef}
        className="relative flex h-[80vh] w-[80vw] items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={(e) => (zoomed ? reset() : zoomAt(e.clientX, e.clientY, 2))}
        style={{ cursor: zoomed ? (drag.current ? "grabbing" : "grab") : "zoom-in" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full select-none object-contain"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transition: drag.current ? "none" : "transform 0.08s ease-out",
            willChange: "transform",
          }}
        />
      </div>

      <p className="absolute bottom-4 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
        Scroll or use the buttons to zoom · drag to pan · double-click to toggle
      </p>
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
