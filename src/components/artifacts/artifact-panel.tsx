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
  FileSpreadsheet,
  Presentation,
  Loader2,
} from "lucide-react";
import { Button } from "ui/button";
import { cn } from "lib/utils";
import type { Artifact } from "@/types/artifact";
import { ArtifactCodeEditor } from "./artifact-code-editor";
import { ArtifactPreview } from "./artifact-preview";
import { SpreadsheetPreview } from "./spreadsheet-preview";
import { PresentationPreview } from "./presentation-preview";
import { useCopy } from "@/hooks/use-copy";
import { callCodeRunWorker } from "lib/code-runner/call-worker";
import { buildPptxExporterCode } from "lib/code-runner/presentation-exporter";
import { buildXlsxExporterCode } from "lib/code-runner/spreadsheet-exporter";

interface Props {
  artifact: Artifact | null | undefined;
  currentIndex: number;
  totalVersions: number;
  onVersionChange: (index: number) => void;
  onClose: () => void;
  isStreaming?: boolean;
}

type ActiveTab = "code" | "preview";

function getDefaultTab(type: string | undefined): ActiveTab {
  if (!type) return "code";
  if (
    type.includes("react") ||
    type === "text/html" ||
    type === "application/vnd.code-html" ||
    type === "application/vnd.presentation" ||
    type === "application/vnd.spreadsheet" ||
    type === "application/vnd.mermaid"
  ) {
    return "preview";
  }
  return "code";
}

function getTypeIcon(type: string | undefined) {
  if (type === "application/vnd.spreadsheet")
    return <FileSpreadsheet className="size-3.5 text-green-500" />;
  if (type === "application/vnd.presentation")
    return <Presentation className="size-3.5 text-blue-500" />;
  return null;
}

export function ArtifactPanel({
  artifact,
  currentIndex,
  totalVersions,
  onVersionChange,
  onClose,
  isStreaming = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    getDefaultTab(artifact?.type),
  );
  const [currentCode, setCurrentCode] = useState<string | undefined>();
  const [exporting, setExporting] = useState(false);
  const { copied, copy } = useCopy();

  const handleContentChange = useCallback((content: string) => {
    setCurrentCode(content);
  }, []);

  const isPresentation = artifact?.type === "application/vnd.presentation";
  const isSpreadsheet = artifact?.type === "application/vnd.spreadsheet";
  const isNativeDoc = isPresentation || isSpreadsheet;

  const handleDownload = useCallback(async () => {
    if (!artifact?.content) return;

    // Native export via Python+Pyodide for presentation/spreadsheet
    if (isPresentation || isSpreadsheet) {
      setExporting(true);
      try {
        const code = isPresentation
          ? buildPptxExporterCode(artifact.content)
          : buildXlsxExporterCode(artifact.content);

        const result = await callCodeRunWorker("python", {
          code,
          timeout: 60000,
        });

        // Find the data URI in stdout logs (printed by Python)
        const dataLog = [...(result.logs ?? [])].reverse().find((l) =>
          String(l.args?.[0]?.value ?? "")
            .trimStart()
            .startsWith("data:application/"),
        );

        if (dataLog?.args?.[0]?.value) {
          const dataUri = String(dataLog.args[0].value).trim();
          const ext = isPresentation ? "pptx" : "xlsx";
          const a = document.createElement("a");
          a.href = dataUri;
          a.download = `${artifact.title.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else if (result.error) {
          console.error("Export failed:", result.error);
        }
      } finally {
        setExporting(false);
      }
      return;
    }

    // Default: plain text download
    const ext = artifact.language ?? "txt";
    const blob = new Blob([artifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [artifact, isPresentation, isSpreadsheet]);

  if (!artifact) return null;

  const hasPreview =
    artifact.type !== "code" &&
    artifact.type !== "text/plain" &&
    artifact.type !== "text/markdown" &&
    artifact.type !== "application/vnd.python";

  return (
    <div className="flex h-full w-full flex-col bg-background border-l border-border">
      {/* Row 1: tabs (left) + actions (right) */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
        {/* Tab Toggle + streaming indicator */}
        <div className="flex items-center gap-2">
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
              {isNativeDoc ? "JSON" : "Code"}
            </button>
            {hasPreview && (
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
            )}
          </div>
          {isStreaming && activeTab === "code" && (
            <RefreshCw className="size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Right actions — fixed width, never compressed */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Version navigation */}
          {totalVersions > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                disabled={currentIndex <= 0}
                onClick={() => onVersionChange(currentIndex - 1)}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums px-0.5 select-none">
                {currentIndex + 1}/{totalVersions}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                disabled={currentIndex >= totalVersions - 1}
                onClick={() => onVersionChange(currentIndex + 1)}
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
            </>
          )}

          {/* Copy */}
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            title="Copy"
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
            disabled={exporting}
            title={
              isPresentation
                ? "Export .pptx"
                : isSpreadsheet
                  ? "Export .xlsx"
                  : "Download"
            }
          >
            {exporting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
          </Button>

          <div className="w-px h-4 bg-border mx-0.5" />

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

      {/* Row 2: title + type badge */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/10 px-4 py-1.5 min-h-[32px]">
        {getTypeIcon(artifact.type)}
        <span className="text-xs font-medium truncate text-foreground/80 flex-1 min-w-0">
          {artifact.title}
        </span>
        {artifact.language && !isNativeDoc && (
          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
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
        ) : isPresentation ? (
          <PresentationPreview artifact={artifact} />
        ) : isSpreadsheet ? (
          <SpreadsheetPreview artifact={artifact} />
        ) : (
          <ArtifactPreview artifact={artifact} currentCode={currentCode} />
        )}
      </div>
    </div>
  );
}
