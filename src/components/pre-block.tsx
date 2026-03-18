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
import { CheckIcon, CopyIcon, PanelRight } from "lucide-react";
import JsonView from "ui/json-view";
import { useCopy } from "@/hooks/use-copy";
import dynamic from "next/dynamic";
import { appStore } from "@/app/store";
import { generateUUID } from "lib/utils";
import { ArtifactType } from "@/types/artifact";

// Dynamically import MermaidDiagram component
const MermaidDiagram = dynamic(
  () => import("./mermaid-diagram").then((mod) => mod.MermaidDiagram),
  {
    loading: () => (
      <div className="text-sm flex bg-accent/30 flex-col rounded-2xl relative my-4 overflow-hidden border">
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

  return (
    <pre className={cn("relative", className)}>
      <div className="p-1.5 border-b mb-4 z-20 bg-secondary">
        <div className="w-full flex z-20 py-0.5 px-4 items-center gap-2">
          <span className="text-sm text-muted-foreground">{lang}</span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs gap-1.5 text-muted-foreground hover:text-primary"
              onClick={() => {
                const typeMap: Record<string, ArtifactType> = {
                  tsx: "application/vnd.react",
                  jsx: "application/vnd.react",
                  html: "text/html",
                  mermaid: "application/vnd.mermaid",
                  markdown: "text/markdown",
                  md: "text/markdown",
                };
                const type = typeMap[lang.toLowerCase()] || "code";
                appStore.setState((prev) => ({
                  artifacts: {
                    ...prev.artifacts,
                    [generateUUID()]: {
                      id: generateUUID(),
                      title: `Code (${lang})`,
                      content: code,
                      type,
                      language: lang,
                      messageId: "manual",
                      lastUpdateTime: Date.now(),
                    },
                  },
                  currentArtifactId: generateUUID(),
                  artifactsPanelOpen: true,
                }));
              }}
            >
              <PanelRight className="size-3.5" />
              Canvas
            </Button>
            <Button
              size="icon"
              variant={copied ? "secondary" : "ghost"}
              className="z-10 p-3! size-2! rounded-sm"
              onClick={() => {
                copy(code);
              }}
            >
              {copied ? <CheckIcon /> : <CopyIcon className="size-3!" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto px-6 pb-6">{children}</div>
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
          theme == "dark" ? "dark-plus" : "github-light",
        ),
      )
      .ifOk(setComponent)
      .watch(() => setLoading(false));
  }, [theme, language, code]);

  // For other code blocks, render as before
  return (
    <div
      className={cn(
        loading && "animate-pulse",
        "text-sm flex bg-secondary/40 shadow border flex-col rounded relative my-4 overflow-hidden",
      )}
    >
      {component}
    </div>
  );
}
