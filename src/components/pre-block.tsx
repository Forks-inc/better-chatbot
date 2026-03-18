"use client";

import type { JSX } from "react";
import {
  bundledLanguages,
  codeToHast,
  type BundledLanguage,
} from "shiki/bundle/web";
import { Fragment, useLayoutEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { safe } from "ts-safe";
import { cn } from "lib/utils";
import { useTheme } from "next-themes";
import { Button } from "ui/button";
import { CheckIcon, CopyIcon, PanelRight, Play } from "lucide-react";
import JsonView from "ui/json-view";
import { useCopy } from "@/hooks/use-copy";
import dynamic from "next/dynamic";
import { appStore } from "@/app/store";
import { generateUUID } from "lib/utils";
import { ArtifactType } from "@/types/artifact";

const MermaidDiagram = dynamic(
  () => import("./mermaid-diagram").then((mod) => mod.MermaidDiagram),
  {
    loading: () => (
      <div className="text-sm flex bg-code-bg flex-col rounded-2xl relative my-4 overflow-hidden border">
        <div className="w-full flex z-20 py-2 px-4 items-center">
          <span className="text-sm text-muted-foreground">mermaid</span>
        </div>
        <div className="relative overflow-x-auto px-6 pb-6">
          <div className="h-20 w-full flex items-center justify-center">
            <span className="text-muted-foreground">
              Loading Mermaid renderer...
            </span>
          </div>
        </div>
      </div>
    ),
    ssr: false,
  },
);

const RUNNABLE_LANGS = new Set([
  "python",
  "javascript",
  "js",
  "typescript",
  "ts",
]);

const CANVAS_TYPE_MAP: Record<string, ArtifactType> = {
  tsx: "application/vnd.react",
  jsx: "application/vnd.react",
  html: "text/html",
  mermaid: "application/vnd.mermaid",
  markdown: "text/markdown",
  md: "text/markdown",
  python: "application/vnd.python",
  js: "code",
  javascript: "code",
  ts: "code",
  typescript: "code",
};

const PurePre = ({
  children,
  className,
  code,
  lang,
}: {
  children: any;
  className?: string;
  code: string;
  lang: string;
}) => {
  const { copied, copy } = useCopy();
  const lineCount = code.split("\n").length;
  const isRunnable = RUNNABLE_LANGS.has(lang.toLowerCase());

  const handleSendToCanvas = () => {
    const type = CANVAS_TYPE_MAP[lang.toLowerCase()] ?? "code";
    const artifactId = generateUUID();
    appStore.setState((prev) => ({
      artifacts: {
        ...prev.artifacts,
        [artifactId]: {
          id: artifactId,
          title: `Code (${lang})`,
          content: code,
          type,
          language: lang,
          messageId: "manual",
          lastUpdateTime: Date.now(),
        },
      },
      currentArtifactId: artifactId,
      artifactsPanelOpen: true,
    }));
  };

  const handleRun = () => {
    const runType = ["python"].includes(lang.toLowerCase())
      ? "application/vnd.python"
      : "code";
    const artifactId = generateUUID();
    appStore.setState((prev) => ({
      artifacts: {
        ...prev.artifacts,
        [artifactId]: {
          id: artifactId,
          title: `Run: ${lang}`,
          content: code,
          type: runType,
          language: lang,
          messageId: "manual",
          lastUpdateTime: Date.now(),
        },
      },
      currentArtifactId: artifactId,
      artifactsPanelOpen: true,
    }));
  };

  return (
    <pre className={cn("relative", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-black/10 dark:bg-white/5">
        <span className="text-xs font-mono text-foreground/50 uppercase tracking-wider">
          {lang}
        </span>
        <span className="text-xs text-muted-foreground/40">
          {lineCount} {lineCount === 1 ? "line" : "lines"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {isRunnable && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs gap-1.5 text-foreground/60 hover:text-foreground"
              onClick={handleRun}
            >
              <Play className="size-3" />
              Run
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1.5 text-foreground/60 hover:text-foreground"
            onClick={handleSendToCanvas}
          >
            <PanelRight className="size-3.5" />
            Canvas
          </Button>
          <Button
            size="icon"
            variant={copied ? "secondary" : "ghost"}
            className="size-7 rounded-sm"
            onClick={() => copy(code)}
          >
            {copied ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div className="relative overflow-x-auto px-6 pb-6 pt-4">{children}</div>
    </pre>
  );
};

export async function Highlight(
  code: string,
  lang: BundledLanguage | (string & {}),
  theme: string,
) {
  const parsed: BundledLanguage = (
    bundledLanguages[lang] ? lang : "md"
  ) as BundledLanguage;

  if (lang === "json") {
    return (
      <PurePre code={code} lang={lang}>
        <JsonView data={code} initialExpandDepth={3} />
      </PurePre>
    );
  }

  if (lang === "mermaid") {
    return (
      <PurePre code={code} lang={lang}>
        <MermaidDiagram chart={code} />
      </PurePre>
    );
  }

  const out = await codeToHast(code, {
    lang: parsed,
    theme,
  });

  return toJsxRuntime(out, {
    Fragment,
    jsx,
    jsxs,
    components: {
      pre: (props) => <PurePre {...props} code={code} lang={lang} />,
    },
  }) as JSX.Element;
}

export function PreBlock({ children }: { children: any }) {
  const code = children.props.children;
  const { theme } = useTheme();
  const language = children.props.className?.split("-")?.[1] || "bash";
  const [loading, setLoading] = useState(true);
  const [component, setComponent] = useState<JSX.Element | null>(
    <PurePre className="animate-pulse" code={code} lang={language}>
      {children}
    </PurePre>,
  );

  useLayoutEffect(() => {
    safe()
      .map(() =>
        Highlight(
          code,
          language,
          theme == "dark" ? "github-dark" : "github-light",
        ),
      )
      .ifOk(setComponent)
      .watch(() => setLoading(false));
  }, [theme, language, code]);

  return (
    <div
      className={cn(
        loading && "animate-pulse",
        "text-sm flex bg-code-bg shadow-sm border flex-col rounded-lg relative my-4 overflow-hidden",
      )}
    >
      {component}
    </div>
  );
}
