"use client";

import { useEffect, useRef, useCallback } from "react";

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  /** The element over which the selection overlay is drawn */
  targetRef: React.RefObject<HTMLElement | null>;
  /** Called with the selection rect (relative to the targetRef element) */
  onSelect: (selection: Selection) => void;
  /** Called when the user cancels (Escape) */
  onCancel?: () => void;
}

/**
 * Overlay that lets the user drag-select a region over a target element.
 * Inspired by open-artifacts SelectionTool.
 */
export function SelectionTool({ targetRef, onSelect, onCancel }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  const getRelativeCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = targetRef.current?.getBoundingClientRect();
      if (!rect) return { x: clientX, y: clientY };
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    [targetRef],
  );

  useEffect(() => {
    const overlay = overlayRef.current;
    const box = boxRef.current;
    if (!overlay || !box) return;

    const onMouseDown = (e: MouseEvent) => {
      dragging.current = true;
      const coords = getRelativeCoords(e.clientX, e.clientY);
      start.current = coords;
      box.style.display = "block";
      box.style.left = `${coords.x}px`;
      box.style.top = `${coords.y}px`;
      box.style.width = "0px";
      box.style.height = "0px";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const coords = getRelativeCoords(e.clientX, e.clientY);
      const x = Math.min(coords.x, start.current.x);
      const y = Math.min(coords.y, start.current.y);
      const w = Math.abs(coords.x - start.current.x);
      const h = Math.abs(coords.y - start.current.y);
      box.style.left = `${x}px`;
      box.style.top = `${y}px`;
      box.style.width = `${w}px`;
      box.style.height = `${h}px`;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const coords = getRelativeCoords(e.clientX, e.clientY);
      const x = Math.min(coords.x, start.current.x);
      const y = Math.min(coords.y, start.current.y);
      const w = Math.abs(coords.x - start.current.x);
      const h = Math.abs(coords.y - start.current.y);
      box.style.display = "none";
      if (w > 10 && h > 10) {
        onSelect({ x, y, width: w, height: h });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel?.();
    };

    overlay.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      overlay.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [getRelativeCoords, onSelect, onCancel]);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-30"
      style={{ cursor: "crosshair" }}
    >
      {/* Selection rectangle */}
      <div
        ref={boxRef}
        className="absolute border-2 border-blue-400 bg-blue-400/10 pointer-events-none"
        style={{ display: "none" }}
      />
      {/* Hint */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none select-none">
        Drag to select a region · Esc to cancel
      </div>
    </div>
  );
}
