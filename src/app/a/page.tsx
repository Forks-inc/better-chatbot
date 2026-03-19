"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ArtifactPreview } from "@/components/artifacts/artifact-preview";
import { Artifact } from "@/types/artifact";
import { Loader2 } from "lucide-react";
import { SvgPreview } from "@/components/artifacts/svg-preview";
import { SpreadsheetPreview } from "@/components/artifacts/spreadsheet-preview";
import { PresentationPreview } from "@/components/artifacts/presentation-preview";
import { ArtifactCodeEditor } from "@/components/artifacts/artifact-code-editor";

function ArtifactViewer() {
  const params = useSearchParams();
  const url = params.get("url");
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (url) {
      fetch(url)
        .then((r) => r.json())
        .then(setArtifact)
        .catch((err) => {
          console.error(err);
          setError("Failed to load artifact");
        });
    } else {
      setError("No artifact URL provided");
    }
  }, [url]);

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-destructive flex-col gap-2">
        <p className="font-semibold">{error}</p>
        <p className="text-sm text-muted-foreground">{url}</p>
      </div>
    );
  }

  if (!artifact) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-background">
      <div className="flex-1 overflow-hidden relative">
        {artifact.type === "application/vnd.presentation" ? (
          <PresentationPreview artifact={artifact} />
        ) : artifact.type === "application/vnd.spreadsheet" ? (
          <SpreadsheetPreview artifact={artifact} />
        ) : artifact.type === "image/svg+xml" ? (
          <SvgPreview artifact={artifact} />
        ) : artifact.type === "code" ||
          artifact.type === "text/plain" ||
          artifact.type === "text/markdown" ||
          artifact.type === "application/vnd.python" ? (
          <ArtifactCodeEditor artifact={artifact} readOnly />
        ) : (
          <ArtifactPreview artifact={artifact} />
        )}
      </div>
      <div className="shrink-0 p-3 bg-muted/30 border-t border-border flex items-center justify-between">
        <span className="text-sm font-medium">{artifact.title}</span>
        <span className="text-xs text-muted-foreground uppercase flex gap-2">
          <span>Powered by</span>
          <span className="font-black">IAN</span>
        </span>
      </div>
    </div>
  );
}

export default function SharedArtifactPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ArtifactViewer />
    </Suspense>
  );
}
