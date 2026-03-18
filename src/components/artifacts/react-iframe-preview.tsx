"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "ui/button";
import { SelectionTool, Selection } from "./selection-tool";
import type { Artifact } from "@/types/artifact";

interface Props {
  artifact: Artifact;
  capturing?: boolean;
  onCapture?: (data: { selectionImg: string; artifactImg: string }) => void;
  onCaptureEnd?: () => void;
}

/**
 * Renders React artifacts in an iframe via postMessage.
 * Faster boot than Sandpack for simple components.
 * Falls back gracefully if renderer fails.
 */
export function ReactIframePreview({
  artifact,
  capturing,
  onCapture,
  onCaptureEnd,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const sendCode = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "UPDATE_COMPONENT", code: artifact.content },
      "*",
    );
  }, [artifact.content]);

  useEffect(() => {
    if (ready) sendCode();
  }, [ready, sendCode]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "INIT_COMPLETE") {
        setReady(true);
        setLoading(false);
      }
      if (event.data?.type === "RENDER_SUCCESS") {
        setError(null);
      }
      if (event.data?.type === "RENDER_ERROR") {
        setError(event.data.error);
      }
      if (event.data?.type === "SELECTION_DATA") {
        onCapture?.(event.data.data);
        onCaptureEnd?.();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onCapture, onCaptureEnd]);

  const handleSelect = useCallback((selection: Selection) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "CAPTURE_SELECTION", selection },
      "*",
    );
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <RefreshCw className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="absolute bottom-0 left-0 right-0 z-10 border-t bg-destructive/10 text-destructive p-3 text-xs font-mono flex items-start gap-2">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          <pre className="whitespace-pre-wrap flex-1 min-w-0">{error}</pre>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 h-6 px-2 text-xs"
            onClick={() => {
              setError(null);
              setRefreshKey((k) => k + 1);
              setReady(false);
              setLoading(true);
            }}
          >
            Retry
          </Button>
        </div>
      )}

      <iframe
        key={refreshKey}
        ref={iframeRef}
        src="/artifact-renderer"
        className="w-full h-full border-0"
        title={artifact.title}
      />

      {capturing && (
        <SelectionTool
          targetRef={containerRef}
          onSelect={handleSelect}
          onCancel={onCaptureEnd}
        />
      )}
    </div>
  );
}
