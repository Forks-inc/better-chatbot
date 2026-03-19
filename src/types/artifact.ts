export interface Artifact {
  id: string;
  title: string;
  content: string;
  type: ArtifactType;
  language?: string;
  messageId?: string;
  lastUpdateTime: number;
}

export type ArtifactType =
  | "application/vnd.react"
  | "application/vnd.ant.react"
  | "text/html"
  | "application/vnd.code-html"
  | "application/vnd.mermaid"
  | "text/markdown"
  | "text/plain"
  | "code"
  | "application/vnd.presentation"
  | "application/vnd.spreadsheet"
  | "application/vnd.python"
  | "image/svg+xml";

export type ArtifactFiles =
  | {
      "App.tsx": string;
      "index.tsx": string;
    }
  | Partial<{
      [x: string]: string | undefined;
    }>;
