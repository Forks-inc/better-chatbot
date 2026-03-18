"use client";

import { useState, useCallback } from "react";
import {
  Code,
  Play,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "ui/button";
import { cn } from "lib/utils";
import type { Artifact } from "@/types/artifact";
import { ArtifactCodeEditor } from "./artifact-code-editor";
import { ArtifactPreview } from "./artifact-preview";
import { useCopy } from "@/hooks/use-copy";

interface Props {
  artifact: Artifact | null | undefined;
  currentIndex: number;
  totalVersions: number;
  onVersionChange: (index: number) => void;
  onClose: () => void;
  isStreaming?: boolean;
}

export function ArtifactPanel({
  artifact,
  currentIndex,
  totalVersions,
  onVersionChange,
  onClose,
  isStreaming = false,
}: Props) {
  const isReact = artifact?.type?.includes("react");
  const [activeTab, setActiveTab] = useState<"code" | "preview">(
    isReact ? "preview" : "code",
  );
  const [currentCode, setCurrentCode] = useState<string | undefined>();
  const { copied, copy } = useCopy();

  const handleContentChange = useCallback((content: string) => {
    setCurrentCode(content);
  }, []);

  const handleDownload = useCallback(() => {
    if (!artifact?.content) return;
    const ext = artifact.language ?? "txt";
    const blob = new Blob([artifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [artifact]);

  if (!artifact) return null;

  return (
    <div className="flex h-full w-full flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-1">
          {/* Tab Toggle */}
          <div className="flex items-center rounded-lg bg-muted p-0.5">
            <button
              onClick={() => setActiveTab("code")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === "code"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Code className="size-3.5" />
              Code
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === "preview"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Play className="size-3.5" />
              Preview
            </button>
          </div>

          {/* Streaming indicator */}
          {isStreaming && activeTab === "code" && (
            <RefreshCw className="size-3.5 animate-spin text-muted-foreground ml-2" />
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Version navigation */}
          {totalVersions > 1 && (
            <div className="flex items-center gap-1 mr-1">
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                disabled={currentIndex <= 0}
                onClick={() => onVersionChange(currentIndex - 1)}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {currentIndex + 1}/{totalVersions}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                disabled={currentIndex >= totalVersions - 1}
                onClick={() => onVersionChange(currentIndex + 1)}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          )}

          {/* Copy */}
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => copy(artifact.content ?? "")}
          >
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>

          {/* Download */}
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={handleDownload}
          >
            <Download className="size-3.5" />
          </Button>

          {/* Close */}
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={onClose}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Title bar */}
      <div className="border-b border-border bg-muted/20 px-4 py-2">
        <h3 className="text-sm font-medium truncate">{artifact.title}</h3>
        {artifact.language && (
          <span className="text-xs text-muted-foreground">
            {artifact.language}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-hidden flex flex-col">
        {activeTab === "code" ? (
          <ArtifactCodeEditor
            artifact={artifact}
            readOnly={isStreaming}
            onContentChange={handleContentChange}
          />
        ) : (
          <ArtifactPreview artifact={artifact} currentCode={currentCode} />
        )}
      </div>
    </div>
  );
}
