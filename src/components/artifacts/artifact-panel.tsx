"use client";

import { appStore } from "@/app/store";
import { useCopy } from "@/hooks/use-copy";
import type { Artifact } from "@/types/artifact";
import { AnimatePresence, motion } from "framer-motion";
import {
  iconBounce,
  slideInRight,
  staggerContainer,
  staggerItem,
  tabSwitch,
} from "lib/animations";
import { callCodeRunWorker } from "lib/code-runner/call-worker";
import { buildPptxExporterCode } from "lib/code-runner/presentation-exporter";
import { buildXlsxExporterCode } from "lib/code-runner/spreadsheet-exporter";
import { cn } from "lib/utils";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Code,
  Copy,
  Download,
  FileSpreadsheet,
  Loader2,
  Maximize2,
  Minimize2,
  MoreVertical,
  Play,
  Presentation,
  RefreshCw,
  Scissors,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { ArtifactCodeEditor } from "./artifact-code-editor";
import { ArtifactPreview } from "./artifact-preview";
import { PresentationPreview } from "./presentation-preview";
import { SpreadsheetPreview } from "./spreadsheet-preview";

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
    type === "application/vnd.mermaid" ||
    type === "image/svg+xml"
  ) {
    return "preview";
  }
  return "code";
}

function TypeIcon({ type }: { type: string | undefined }) {
  if (type === "application/vnd.spreadsheet")
    return <FileSpreadsheet className="size-3.5 text-green-500 shrink-0" />;
  if (type === "application/vnd.presentation")
    return <Presentation className="size-3.5 text-blue-500 shrink-0" />;
  return null;
}

function supportsRefresh(type: string | undefined) {
  return (
    type === "text/html" ||
    type === "application/vnd.code-html" ||
    type === "application/vnd.react" ||
    type === "application/vnd.ant.react"
  );
}

function supportsCapture(type: string | undefined) {
  return (
    type === "text/html" ||
    type === "application/vnd.code-html" ||
    type === "application/vnd.react" ||
    type === "application/vnd.ant.react"
  );
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
  const [publishing, setPublishing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const { copied, copy } = useCopy();

  const handleContentChange = useCallback((content: string) => {
    setCurrentCode(content);
  }, []);

  const isPresentation = artifact?.type === "application/vnd.presentation";
  const isSpreadsheet = artifact?.type === "application/vnd.spreadsheet";
  const isNativeDoc = isPresentation || isSpreadsheet;

  const handleDownload = useCallback(async () => {
    if (!artifact?.content) return;

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

    const ext = artifact.language ?? "txt";
    const blob = new Blob([artifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [artifact, isPresentation, isSpreadsheet]);

  const handleCapture = useCallback(
    (data: { selectionImg: string; artifactImg: string }) => {
      fetch(data.selectionImg)
        .then((r) => r.blob())
        .then((blob) => {
          const item = new ClipboardItem({ "image/png": blob });
          return navigator.clipboard.write([item]);
        })
        .catch(() => {
          const a = document.createElement("a");
          a.href = data.selectionImg;
          a.download = "capture.png";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
    },
    [],
  );

  const handlePublish = useCallback(async () => {
    if (!artifact) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/artifacts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifact }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to publish");
      }
      const { url } = await res.json();
      const shareUrl = `${window.location.protocol}//${window.location.host}/a?url=${encodeURIComponent(url)}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Public link copied to clipboard");
    } catch (e: any) {
      toast.error(e.message || "Failed to publish artifact");
    } finally {
      setPublishing(false);
    }
  }, [artifact]);

  if (!artifact) return null;

  const hasPreview =
    artifact.type !== "code" &&
    artifact.type !== "text/plain" &&
    artifact.type !== "text/markdown" &&
    artifact.type !== "application/vnd.python";

  const showRefresh =
    activeTab === "preview" && supportsRefresh(artifact.type) && !isStreaming;
  const showCapture =
    activeTab === "preview" && supportsCapture(artifact.type) && !isStreaming;

  return (
    <motion.div
      variants={slideInRight}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        "flex flex-col glass-sidebar",
        fullscreen ? "fixed inset-0 z-50" : "h-full w-full border-l",
      )}
    >
      <motion.div
        variants={staggerContainer}
        className="flex items-center justify-between gap-2 border-b border-border/30 glass px-3 py-2"
      >
        <motion.div variants={staggerItem} className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-muted p-0.5">
            <motion.button
              onClick={() => setActiveTab("code")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === "code"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              whileTap={{ scale: 0.95 }}
            >
              <Code className="size-3.5" />
              {isNativeDoc ? "JSON" : "Code"}
            </motion.button>
            {hasPreview && (
              <motion.button
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  activeTab === "preview"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Play className="size-3.5" />
                Preview
              </motion.button>
            )}
          </div>
          {isStreaming && activeTab === "code" && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw className="size-3.5 text-muted-foreground" />
            </motion.div>
          )}
        </motion.div>

        <motion.div
          variants={staggerItem}
          className="flex items-center gap-0.5 shrink-0"
        >
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
              <motion.span
                className="text-xs text-muted-foreground tabular-nums px-0.5 select-none"
                key={currentIndex}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {currentIndex + 1}/{totalVersions}
              </motion.span>
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

          {showRefresh && (
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                title="Refresh preview"
                onClick={() => setRefreshKey((k) => k + 1)}
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </motion.div>
          )}

          {showCapture && (
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "size-7",
                  capturing && "text-primary bg-primary/10",
                )}
                title="Capture selection"
                onClick={() => setCapturing((v) => !v)}
              >
                <Scissors className="size-3.5" />
              </Button>
            </motion.div>
          )}

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              title="Ask AI to edit"
              onClick={() => {
                appStore.getState().mutate({
                  pendingAutoMessage: `Please update the artifact "${artifact.title}"`,
                });
              }}
            >
              <Sparkles className="size-3.5 text-primary" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              title="Copy"
              onClick={() => copy(artifact.content ?? "")}
            >
              <motion.div
                key={copied ? "checked" : "copy"}
                variants={iconBounce}
                initial="initial"
                animate="animate"
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </motion.div>
            </Button>
          </motion.div>

          <div className="w-px h-4 bg-border mx-0.5" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button size="icon" variant="ghost" className="size-7">
                  <MoreVertical className="size-3.5" />
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleDownload} disabled={exporting}>
                {exporting ? (
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                ) : (
                  <Download className="mr-2 size-3.5" />
                )}
                <span>Export / Download</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePublish} disabled={publishing}>
                {publishing ? (
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                ) : (
                  <Share2 className="mr-2 size-3.5" />
                )}
                <span>Publish public link</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFullscreen((v) => !v)}>
                {fullscreen ? (
                  <Minimize2 className="mr-2 size-3.5" />
                ) : (
                  <Maximize2 className="mr-2 size-3.5" />
                )}
                <span>{fullscreen ? "Exit fullscreen" : "Fullscreen"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={onClose}
            >
              <X className="size-3.5" />
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        variants={staggerItem}
        className="flex items-center gap-2 border-b border-border bg-muted/10 px-4 py-1.5 min-h-[32px]"
      >
        <TypeIcon type={artifact.type} />
        <span className="text-xs font-medium truncate text-foreground/80 flex-1 min-w-0">
          {artifact.title}
        </span>
        {artifact.language && !isNativeDoc && (
          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
            {artifact.language}
          </span>
        )}
      </motion.div>

      <div className="relative flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabSwitch}
            initial="initial"
            animate="animate"
            exit="exit"
            className="h-full w-full"
          >
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
              <ArtifactPreview
                artifact={artifact}
                currentCode={currentCode}
                capturing={capturing}
                onCapture={handleCapture}
                onCaptureEnd={() => setCapturing(false)}
                refreshKey={refreshKey}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
