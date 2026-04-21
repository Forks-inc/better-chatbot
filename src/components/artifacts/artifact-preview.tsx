"use client";

import type { Artifact } from "@/types/artifact";
import {
  type SandpackPredefinedTemplate,
  SandpackPreview,
  SandpackProvider,
  type SandpackProviderProps,
} from "@codesandbox/sandpack-react";
import { motion } from "framer-motion";
import { fadeIn, tabSwitch } from "lib/animations";
import { MermaidDiagram } from "../mermaid-diagram";
import { HtmlPreview } from "./html-preview";
import { ReactIframePreview } from "./react-iframe-preview";
import { SvgPreview } from "./svg-preview";

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

  if (
    artifact.type === "text/html" ||
    artifact.type === "application/vnd.code-html"
  ) {
    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="h-full w-full"
      >
        <HtmlPreview
          key={refreshKey}
          artifact={{ ...artifact, content }}
          capturing={capturing}
          onCapture={onCapture}
          onCaptureEnd={onCaptureEnd}
        />
      </motion.div>
    );
  }

  if (
    artifact.type === "application/vnd.react" ||
    artifact.type === "application/vnd.ant.react"
  ) {
    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="h-full w-full"
      >
        <ReactIframePreview
          key={refreshKey}
          artifact={{ ...artifact, content }}
          capturing={capturing}
          onCapture={onCapture}
          onCaptureEnd={onCaptureEnd}
        />
      </motion.div>
    );
  }

  if (artifact.type === "application/vnd.mermaid") {
    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="h-full w-full overflow-auto p-4"
      >
        <MermaidDiagram chart={content} />
      </motion.div>
    );
  }

  if (artifact.type === "image/svg+xml") {
    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="h-full w-full"
      >
        <SvgPreview artifact={{ ...artifact, content }} />
      </motion.div>
    );
  }

  if (
    artifact.type === "code" ||
    artifact.type === "text/plain" ||
    artifact.type === "text/markdown"
  ) {
    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="flex h-full w-full items-center justify-center text-muted-foreground"
      >
        <p className="text-sm">
          Preview is only available for React and HTML artifacts
        </p>
      </motion.div>
    );
  }

  if (!artifact.content) {
    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="flex h-full w-full items-center justify-center text-muted-foreground"
      >
        No content to preview
      </motion.div>
    );
  }

  const template: SandpackPredefinedTemplate = "static";
  const files = { "index.html": content };
  const customSetup: SandpackProviderProps["customSetup"] = {
    dependencies: {},
  };
  const options: SandpackProviderProps["options"] = {
    externalResources: ["https://cdn.tailwindcss.com/3.4.17"],
  };

  return (
    <motion.div
      variants={tabSwitch}
      initial="initial"
      animate="animate"
      exit="exit"
      className="h-full w-full overflow-hidden"
    >
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
    </motion.div>
  );
}
