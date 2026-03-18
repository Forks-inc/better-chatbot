"use client";

import { useCallback, useEffect, useRef } from "react";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import type { Artifact, ArtifactType } from "@/types/artifact";

interface ArtifactMeta {
  id: string;
  title: string;
  type: ArtifactType;
  language?: string;
}

const ARTIFACT_REGEX = /:::artifact\{([^}]*)\}\s*\n([\s\S]*?):::/gm;

const CODE_BLOCK_REGEX = /```(\w+)\n([\s\S]*?)```/gm;

function parseArtifactMeta(attrs: string): Partial<ArtifactMeta> {
  const result: Record<string, string> = {};
  const regex = /(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(attrs)) !== null) {
    result[match[1]] = match[2];
  }
  return result as Partial<ArtifactMeta>;
}

function languageToType(lang: string): ArtifactType {
  switch (lang.toLowerCase()) {
    case "typescript":
    case "javascript":
    case "react":
      return "application/vnd.react";
    case "html":
      return "text/html";
    case "mermaid":
      return "application/vnd.mermaid";
    case "markdown":
    case "md":
      return "text/markdown";
    case "json":
      return "code";
    default:
      return "code";
  }
}

/**
 * Extracts artifacts from the assistant's latest message text.
 * Supports both `:::artifact{...}:::` blocks and large code blocks.
 * IMPORTANT: Uses deterministic IDs for code blocks (messageId-based)
 * to prevent infinite re-creation on every render.
 */
function extractArtifacts(text: string, messageId: string): Artifact[] {
  const artifacts: Artifact[] = [];
  const seen = new Set<string>();

  // 1. Explicit :::artifact blocks
  let match: RegExpExecArray | null;
  const artifactRegex = new RegExp(ARTIFACT_REGEX.source, "gm");
  while ((match = artifactRegex.exec(text)) !== null) {
    const meta = parseArtifactMeta(match[1]);
    const content = match[2].trim();
    // Strip surrounding code fences if present
    const codeMatch = content.match(/^```\w*\n([\s\S]*?)```$/);
    const finalContent = codeMatch ? codeMatch[1] : content;
    const id = meta.id || `${messageId}-artifact-${artifacts.length}`;
    if (!seen.has(id)) {
      seen.add(id);
      artifacts.push({
        id,
        title: meta.title || "Artifact",
        content: finalContent,
        type: (meta.type as ArtifactType) || "code",
        language: meta.language,
        messageId,
        lastUpdateTime: Date.now(),
      });
    }
  }

  // 2. Large code blocks (>=5 lines, React/HTML/etc.)
  if (artifacts.length === 0) {
    const codeRegex = new RegExp(CODE_BLOCK_REGEX.source, "gm");
    let codeBlockIndex = 0;
    while ((match = codeRegex.exec(text)) !== null) {
      const lang = match[1];
      const content = match[2];
      const lines = content.split("\n").length;
      if (
        lines >= 5 &&
        [
          "tsx",
          "jsx",
          "html",
          "react",
          "typescript",
          "javascript",
          "json",
          "python",
          "css",
          "sql",
        ].includes(lang.toLowerCase())
      ) {
        const id = `${messageId}-codeblock-${codeBlockIndex}`;
        codeBlockIndex++;
        artifacts.push({
          id,
          title: `Code (${lang})`,
          content,
          type: languageToType(lang),
          language: lang,
          messageId,
          lastUpdateTime: Date.now(),
        });
      }
    }
  }

  return artifacts;
}

export function useArtifacts(
  messages: { id: string; role: string; parts: any[] }[],
  isSubmitting: boolean,
) {
  const [mutate, artifacts, currentArtifactId] = appStore(
    useShallow((s) => [s.mutate, s.artifacts, s.currentArtifactId]),
  );

  const prevMessageCountRef = useRef(0);
  // Track which artifacts we already auto-opened the panel for.
  const autoOpenedArtifactIdsRef = useRef<Set<string>>(new Set());

  // Extract artifacts from ALL assistant messages
  useEffect(() => {
    const allNewArtifacts: Record<string, Artifact> = {};
    let hasNew = false;
    let latestId: string | null = null;

    for (const message of messages) {
      if (message.role !== "assistant") continue;

      const text = message.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n");

      if (!text) continue;

      const extracted = extractArtifacts(text, message.id);
      for (const artifact of extracted) {
        const existing = artifacts[artifact.id];
        if (!existing || existing.content !== artifact.content) {
          allNewArtifacts[artifact.id] = artifact;
          hasNew = true;
        }
        latestId = artifact.id;
      }
    }

    if (hasNew && latestId) {
      const isNewArtifact = !autoOpenedArtifactIdsRef.current.has(latestId);

      if (isNewArtifact) {
        // First time seeing this artifact → auto-open
        autoOpenedArtifactIdsRef.current.add(latestId);
        mutate((prev) => ({
          artifacts: { ...prev.artifacts, ...allNewArtifacts },
          currentArtifactId: latestId,
          artifactsPanelOpen: true,
        }));
      } else {
        // Existing artifact update → preserve user's panel choice
        mutate((prev) => ({
          artifacts: { ...prev.artifacts, ...allNewArtifacts },
          currentArtifactId: prev.currentArtifactId || latestId,
        }));
      }
    }
  }, [messages, isSubmitting]);

  // Reset artifacts when conversation changes
  useEffect(() => {
    if (messages.length === 0 && prevMessageCountRef.current > 0) {
      autoOpenedArtifactIdsRef.current.clear();
      mutate({
        artifacts: {},
        currentArtifactId: null,
        artifactsPanelOpen: false,
      });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  const panelOpen = appStore((s) => s.artifactsPanelOpen);

  const currentArtifact = currentArtifactId
    ? artifacts[currentArtifactId]
    : null;

  const orderedArtifactIds = Object.keys(artifacts)
    .filter((id) => artifacts[id] != null)
    .sort(
      (a, b) =>
        (artifacts[a]!.lastUpdateTime ?? 0) -
        (artifacts[b]!.lastUpdateTime ?? 0),
    );

  const currentIndex = orderedArtifactIds.indexOf(currentArtifactId ?? "");

  const setCurrentArtifactId = useCallback(
    (id: string) => {
      autoOpenedArtifactIdsRef.current.add(id); // mark as auto-opened since user clicked it
      mutate({ currentArtifactId: id, artifactsPanelOpen: true });
    },
    [mutate],
  );

  const closePanel = useCallback(() => {
    mutate({ artifactsPanelOpen: false });
  }, [mutate]);

  const openPanel = useCallback(() => {
    mutate({ artifactsPanelOpen: true });
  }, [mutate]);

  return {
    currentArtifact,
    currentArtifactId,
    currentIndex,
    orderedArtifactIds,
    panelOpen,
    setCurrentArtifactId,
    closePanel,
    openPanel,
    artifacts,
  };
}
