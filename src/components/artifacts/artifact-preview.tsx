"use client";

import {
  SandpackProvider,
  SandpackPreview,
  type SandpackPredefinedTemplate,
  type SandpackProviderProps,
} from "@codesandbox/sandpack-react";
import type { Artifact } from "@/types/artifact";
import { HtmlPreview } from "./html-preview";
import { ReactIframePreview } from "./react-iframe-preview";

interface Props {
  artifact: Artifact;
  currentCode?: string;
  capturing?: boolean;
  onCapture?: (data: { selectionImg: string; artifactImg: string }) => void;
  onCaptureEnd?: () => void;
  refreshKey?: number;
}

export function ArtifactPreview({
  artifact,
  currentCode,
  capturing,
  onCapture,
  onCaptureEnd,
  refreshKey,
}: Props) {
  const content = currentCode ?? artifact.content ?? "";

  // HTML → fast iframe with capture support
  if (
    artifact.type === "text/html" ||
    artifact.type === "application/vnd.code-html"
  ) {
    return (
      <HtmlPreview
        key={refreshKey}
        artifact={{ ...artifact, content }}
        capturing={capturing}
        onCapture={onCapture}
        onCaptureEnd={onCaptureEnd}
      />
    );
  }

  // React → lightweight iframe renderer (faster than Sandpack)
  if (
    artifact.type === "application/vnd.react" ||
    artifact.type === "application/vnd.ant.react"
  ) {
    return (
      <ReactIframePreview
        key={refreshKey}
        artifact={{ ...artifact, content }}
        capturing={capturing}
        onCapture={onCapture}
        onCaptureEnd={onCaptureEnd}
      />
    );
  }

  // Non-previewable types
  if (
    artifact.type === "code" ||
    artifact.type === "text/plain" ||
    artifact.type === "text/markdown"
  ) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <p className="text-sm">
          Preview is only available for React and HTML artifacts
        </p>
      </div>
    );
  }

  if (!artifact.content) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        No content to preview
      </div>
    );
  }

  // Fallback: Sandpack for any other type
  const template: SandpackPredefinedTemplate = "static";
  const files = { "index.html": content };
  const customSetup: SandpackProviderProps["customSetup"] = {
    dependencies: {},
  };
  const options: SandpackProviderProps["options"] = {
    externalResources: ["https://cdn.tailwindcss.com/3.4.17"],
  };

  return (
    <div className="h-full w-full overflow-hidden">
      <SandpackProvider
        template={template}
        files={files}
        customSetup={customSetup}
        options={options}
        theme="dark"
        style={{ height: "100%", width: "100%" }}
      >
        <SandpackPreview
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
          style={{ height: "100%", width: "100%" }}
        />
      </SandpackProvider>
    </div>
  );
}
