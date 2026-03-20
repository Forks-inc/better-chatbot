"use client";

import { useEffect, useState } from "react";
import { ToolUIPart } from "ai";
import { appStore } from "@/app/store";
import { generateUUID } from "lib/utils";
// No lucide icons needed here since ArtifactCard handles them
import { ArtifactCard } from "../message-parts";

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
  const [internalId, setInternalId] = useState<string | null>(null);

  useEffect(() => {
    if (!output) return;
    const result = output as DocumentResult;
    if (!result?.content) return;

    const idToUse = result.artifactId ?? generateUUID();
    setInternalId(idToUse);
    const artifactId = idToUse;
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
  const label =
    docType === "presentation"
      ? "Creating presentation..."
      : "Creating spreadsheet...";

  return (
    <div className="px-6 py-2">
      <ArtifactCard
        artifact={{
          id: internalId || "pending",
          title: (output as DocumentResult)?.title || label,
          content: "",
          type:
            docType === "presentation"
              ? "application/vnd.presentation"
              : "application/vnd.spreadsheet",
          language: docType === "presentation" ? "pptx" : "xlsx",
          generating: isLoading,
        }}
      />
    </div>
  );
}
