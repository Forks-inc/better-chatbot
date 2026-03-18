"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "ui/button";
import { injectCaptureScripts } from "lib/artifacts/inject-capture";
import { SelectionTool, Selection } from "./selection-tool";
import type { Artifact } from "@/types/artifact";

interface Props {
  artifact: Artifact;
  capturing?: boolean;
  onCapture?: (data: { selectionImg: string; artifactImg: string }) => void;
  onCaptureEnd?: () => void;
}

/**
 * Renders HTML artifacts in a sandboxed iframe with srcDoc.
 * Faster than Sandpack — no build step.
 * Supports screenshot capture via html2canvas injection.
 */
export function HtmlPreview({
  artifact,
  capturing,
  onCapture,
  onCaptureEnd,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for postMessage from iframe (capture result)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SELECTION_DATA") {
        onCapture?.(event.data.data);
        onCaptureEnd?.();
      }
      if (event.data?.type === "CAPTURE_ERROR") {
        console.error("Capture error:", event.data.error);
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

  const openInNewWindow = useCallback(() => {
    const blob = new Blob([artifact.content ?? ""], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [artifact.content]);

  const srcDoc = injectCaptureScripts(artifact.content ?? "");

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8">
        <AlertCircle className="size-10 text-amber-500" />
        <p className="text-sm">{error}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null);
              setRefreshKey((k) => k + 1);
            }}
          >
            <RefreshCw className="size-3.5 mr-1.5" /> Retry
          </Button>
          <Button size="sm" variant="outline" onClick={openInNewWindow}>
            <ExternalLink className="size-3.5 mr-1.5" /> Open in new window
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <RefreshCw className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      <iframe
        key={refreshKey}
        ref={iframeRef}
        srcDoc={srcDoc}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        title={artifact.title}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError("Failed to render HTML content.");
        }}
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
