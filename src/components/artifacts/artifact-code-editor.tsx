"use client";

import { useRef, useMemo, useCallback, useEffect } from "react";
import MonacoEditor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { Artifact } from "@/types/artifact";

const LANG_MAP: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  css: "css",
  json: "json",
  markdown: "markdown",
  html: "html",
  xml: "xml",
  sql: "sql",
  yaml: "yaml",
  shell: "shell",
  bash: "shell",
  tsx: "typescript",
  jsx: "javascript",
  c: "c",
  cpp: "cpp",
  java: "java",
  go: "go",
  rust: "rust",
  php: "php",
  ruby: "ruby",
};

const TYPE_MAP: Record<string, string> = {
  "text/html": "html",
  "application/vnd.code-html": "html",
  "application/vnd.react": "typescript",
  "application/vnd.ant.react": "typescript",
  "text/markdown": "markdown",
  "text/plain": "plaintext",
  "application/vnd.mermaid": "markdown",
  "application/vnd.presentation": "json",
  "application/vnd.spreadsheet": "json",
  "application/vnd.python": "python",
  code: "plaintext",
};

function getMonacoLanguage(type?: string, language?: string): string {
  if (language && LANG_MAP[language]) {
    return LANG_MAP[language];
  }
  return TYPE_MAP[type ?? ""] ?? "plaintext";
}

interface Props {
  artifact: Artifact;
  readOnly?: boolean;
  onContentChange?: (content: string) => void;
}

export function ArtifactCodeEditor({
  artifact,
  readOnly = false,
  onContentChange,
}: Props) {
  const monacoRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const prevContentRef = useRef(artifact.content ?? "");
  const prevArtifactId = useRef(artifact.id);

  // Streaming: append new content instead of replacing
  useEffect(() => {
    const ed = monacoRef.current;
    if (!ed || !readOnly) return;
    const newContent = artifact.content ?? "";
    const prev = prevContentRef.current;
    if (newContent === prev) return;

    const model = ed.getModel();
    if (!model) return;

    if (newContent.startsWith(prev) && prev.length > 0) {
      const appended = newContent.slice(prev.length);
      const endPos = model.getPositionAt(model.getValueLength());
      model.applyEdits([
        {
          range: {
            startLineNumber: endPos.lineNumber,
            startColumn: endPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
          },
          text: appended,
        },
      ]);
    } else {
      model.setValue(newContent);
    }

    prevContentRef.current = newContent;
    ed.revealLine(model.getLineCount());
  }, [artifact.content, readOnly]);

  // Handle artifact switch
  useEffect(() => {
    if (artifact.id === prevArtifactId.current) return;
    prevArtifactId.current = artifact.id;
    prevContentRef.current = artifact.content ?? "";
    const ed = monacoRef.current;
    if (ed && artifact.content != null) {
      ed.getModel()?.setValue(artifact.content);
    }
  }, [artifact.id, artifact.content]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined || readOnly) return;
      prevContentRef.current = value;
      onContentChange?.(value);
    },
    [readOnly, onContentChange],
  );

  const handleMount = useCallback((ed: editor.IStandaloneCodeEditor) => {
    monacoRef.current = ed;
    prevContentRef.current =
      ed.getModel()?.getValue() ?? artifact.content ?? "";
  }, []);

  const language = getMonacoLanguage(artifact.type, artifact.language);

  const editorOptions = useMemo<editor.IStandaloneEditorConstructionOptions>(
    () => ({
      readOnly,
      minimap: { enabled: false },
      lineNumbers: "on",
      scrollBeyondLastLine: false,
      fontSize: 13,
      tabSize: 2,
      wordWrap: "on",
      automaticLayout: true,
      padding: { top: 8 },
      renderLineHighlight: readOnly ? "none" : "line",
      cursorStyle: readOnly ? "underline-thin" : "line",
      scrollbar: {
        vertical: "visible",
        horizontal: "auto",
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
        useShadows: false,
        alwaysConsumeMouseWheel: false,
      },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      folding: false,
      glyphMargin: false,
    }),
    [readOnly],
  );

  if (!artifact.content) return null;

  return (
    <div className="h-full w-full bg-[#1e1e1e]">
      <MonacoEditor
        height="100%"
        language={language}
        theme="vs-dark"
        defaultValue={artifact.content}
        onChange={handleChange}
        onMount={handleMount}
        options={editorOptions}
      />
    </div>
  );
}
