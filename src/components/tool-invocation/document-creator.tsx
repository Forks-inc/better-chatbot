"use client";

import { useEffect } from "react";
import { ToolUIPart } from "ai";
import { appStore } from "@/app/store";
import { generateUUID } from "lib/utils";
import { FileSpreadsheet, Presentation } from "lucide-react";

interface DocumentResult {
  artifactId?: string;
  type: "application/vnd.presentation" | "application/vnd.spreadsheet";
  title: string;
  content: string;
  language?: string;
}

export function DocumentCreatorInvocation({
  part,
  docType,
}: {
  part: ToolUIPart;
  docType: "presentation" | "spreadsheet";
}) {
  const state = part.state;
  const output = state.startsWith("output") ? (part as any).output : null;

  useEffect(() => {
    if (!output) return;
    const result = output as DocumentResult;
    if (!result?.content) return;

    const artifactId = result.artifactId ?? generateUUID();
    appStore.setState((prev) => ({
      artifacts: {
        ...prev.artifacts,
        [artifactId]: {
          id: artifactId,
          title: result.title,
          content: result.content,
          type: result.type,
          language: result.language ?? "json",
          messageId: "tool",
          lastUpdateTime: Date.now(),
        },
      },
      currentArtifactId: artifactId,
      artifactsPanelOpen: true,
    }));
  }, [output]);

  const isLoading = state.startsWith("input");
  const Icon = docType === "presentation" ? Presentation : FileSpreadsheet;
  const label =
    docType === "presentation"
      ? "Creating presentation..."
      : "Creating spreadsheet...";
  const doneLabel =
    docType === "presentation" ? "Presentation ready" : "Spreadsheet ready";

  return (
    <div className="px-6 py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span>{isLoading ? label : doneLabel}</span>
        {isLoading && <span className="ml-1 animate-pulse">●</span>}
      </div>
    </div>
  );
}
