"use client";

import { useMemo } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  type SandpackPredefinedTemplate,
  type SandpackProviderProps,
} from "@codesandbox/sandpack-react";
import type { Artifact } from "@/types/artifact";

const templateMap: Record<string, SandpackPredefinedTemplate> = {
  "application/vnd.react": "react-ts",
  "application/vnd.ant.react": "react-ts",
  "text/html": "static",
  "application/vnd.code-html": "static",
  default: "static",
};

const dependenciesMap: Record<string, Record<string, string>> = {
  "application/vnd.react": {
    "lucide-react": "^0.394.0",
    recharts: "2.12.7",
    "date-fns": "^3.3.1",
    "class-variance-authority": "^0.6.0",
    clsx: "^1.2.1",
    "tailwind-merge": "^1.9.1",
  },
  "application/vnd.ant.react": {
    "lucide-react": "^0.394.0",
    recharts: "2.12.7",
    "date-fns": "^3.3.1",
    "class-variance-authority": "^0.6.0",
    clsx: "^1.2.1",
    "tailwind-merge": "^1.9.1",
  },
};

function getFilename(type: string): string {
  if (type.includes("react")) return "App.tsx";
  return "index.html";
}

interface Props {
  artifact: Artifact;
  currentCode?: string;
}

export function ArtifactPreview({ artifact, currentCode }: Props) {
  const template = templateMap[artifact.type] ?? templateMap.default;
  const filename = getFilename(artifact.type);
  const content = currentCode ?? artifact.content ?? "";

  const files = useMemo(
    () => ({
      [filename]: content,
    }),
    [filename, content],
  );

  const customSetup: SandpackProviderProps["customSetup"] = useMemo(
    () => ({
      dependencies: dependenciesMap[artifact.type] ?? {},
    }),
    [artifact.type],
  );

  const options: SandpackProviderProps["options"] = useMemo(
    () => ({
      externalResources: ["https://cdn.tailwindcss.com/3.4.17"],
    }),
    [],
  );

  if (!artifact.content) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        No content to preview
      </div>
    );
  }

  // For non-previewable types, show a message
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

  return (
    <SandpackProvider
      template={template}
      files={files}
      customSetup={customSetup}
      options={options}
      theme="dark"
    >
      <SandpackPreview
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        style={{ height: "100%", width: "100%" }}
      />
    </SandpackProvider>
  );
}
