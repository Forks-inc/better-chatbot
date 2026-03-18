/**
 * Parses AI message text for <artifact> XML tags and extracts them.
 * Adapted from open-artifacts parseMessage() pattern.
 *
 * Supported tag format:
 *   <artifact identifier="id" type="application/vnd.react" title="My App" language="tsx">
 *     ...code content...
 *   </artifact>
 */

import type { ArtifactType } from "@/types/artifact";

export interface ParsedArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  language?: string;
  content: string;
  generating: boolean;
}

export interface MessagePart {
  type: "text" | "artifact";
  text?: string;
  artifact?: ParsedArtifact;
}

const ARTIFACT_OPEN = "<artifact";
const ARTIFACT_CLOSE = "</artifact>";

/** Maps common type strings to our ArtifactType enum */
function normalizeType(raw: string | null): ArtifactType {
  if (!raw) return "code";
  const map: Record<string, ArtifactType> = {
    "application/react": "application/vnd.react",
    "application/vnd.react": "application/vnd.react",
    "application/vnd.ant.react": "application/vnd.ant.react",
    "text/html": "text/html",
    "application/vnd.code-html": "application/vnd.code-html",
    "application/vnd.mermaid": "application/vnd.mermaid",
    "text/markdown": "text/markdown",
    "text/plain": "text/plain",
    "application/vnd.presentation": "application/vnd.presentation",
    "application/vnd.spreadsheet": "application/vnd.spreadsheet",
    "application/vnd.python": "application/vnd.python",
    "application/code": "code",
    code: "code",
  };
  return map[raw] ?? "code";
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

/**
 * Parses a streamed/complete message string into text + artifact parts.
 * Handles incomplete closing tags (streaming case).
 */
export function parseMessageArtifacts(message: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let i = 0;
  let buffer = "";

  while (i < message.length) {
    const openIdx = message.indexOf(ARTIFACT_OPEN, i);

    if (openIdx === -1) {
      // No more artifacts — rest is text
      buffer += message.slice(i);
      break;
    }

    // Text before this artifact
    buffer += message.slice(i, openIdx);
    if (buffer.trim()) {
      parts.push({ type: "text", text: buffer.trim() });
      buffer = "";
    }

    // Find closing >  of the opening tag
    const tagEnd = message.indexOf(">", openIdx);
    if (tagEnd === -1) {
      // Incomplete opening tag — treat rest as text
      buffer += message.slice(openIdx);
      break;
    }

    const openTag = message.slice(openIdx + 1, tagEnd); // e.g. "artifact identifier=..."
    const attrs = parseAttributes(openTag);

    const closeIdx = message.indexOf(ARTIFACT_CLOSE, tagEnd + 1);
    const generating = closeIdx === -1;
    const content = generating
      ? message.slice(tagEnd + 1)
      : message.slice(tagEnd + 1, closeIdx);

    parts.push({
      type: "artifact",
      artifact: {
        id: attrs.identifier ?? attrs.id ?? `artifact-${parts.length}`,
        type: normalizeType(attrs.type ?? null),
        title: attrs.title ?? "Artifact",
        language: attrs.language,
        content: content.trim(),
        generating,
      },
    });

    i = generating ? message.length : closeIdx + ARTIFACT_CLOSE.length;
  }

  if (buffer.trim()) {
    parts.push({ type: "text", text: buffer.trim() });
  }

  return mergeTextParts(parts);
}

function mergeTextParts(parts: MessagePart[]): MessagePart[] {
  const result: MessagePart[] = [];
  let current = "";
  for (const p of parts) {
    if (p.type === "text") {
      current += (current ? " " : "") + (p.text ?? "");
    } else {
      if (current) {
        result.push({ type: "text", text: current });
        current = "";
      }
      result.push(p);
    }
  }
  if (current) result.push({ type: "text", text: current });
  return result;
}

/**
 * Strips <artifact>...</artifact> tags from a message string,
 * returning only the surrounding text.
 */
export function stripArtifactTags(message: string): string {
  return message
    .replace(/<artifact[^>]*>[\s\S]*?<\/artifact>/g, "")
    .replace(/<artifact[^>]*>[\s\S]*/g, "") // incomplete tag (streaming)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Returns true if a message string contains at least one <artifact> tag.
 */
export function hasArtifactTags(message: string): boolean {
  return message.includes(ARTIFACT_OPEN);
}
