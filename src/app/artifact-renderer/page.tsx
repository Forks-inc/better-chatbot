"use client";

/**
 * Minimal React artifact renderer page.
 * Lives at /artifact-renderer — loaded in an iframe by ReactIframePreview.
 * Receives React component code via postMessage and renders it.
 *
 * Inspired by open-artifacts ReactArtifact renderer pattern.
 */

import { useEffect, useRef } from "react";

export default function ArtifactRendererPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Signal parent that we're ready
    window.parent?.postMessage({ type: "INIT_COMPLETE" }, "*");

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type !== "UPDATE_COMPONENT") return;

      const code: string = event.data.code ?? "";
      const container = containerRef.current;
      if (!container) return;

      try {
        // Dynamically import React + ReactDOM from the page's module scope
        const React = await import("react");
        const { createRoot } = await import("react-dom/client");

        // Transform JSX → JS using a CDN-based babel standalone
        // We use a blob-based dynamic import approach
        const babelUrl =
          "https://unpkg.com/@babel/standalone@7.24.0/babel.min.js";

        if (!(window as any).__babel__) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = babelUrl;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load Babel"));
            document.head.appendChild(s);
          });
          (window as any).__babel__ = (window as any).Babel;
        }

        // Pre-load common libraries from ESM CDN if they aren't loaded
        // @ts-ignore
        if (!(window as any).__Recharts__) {
          try {
            // @ts-ignore
            (window as any).__Recharts__ = await import(
              "https://esm.sh/recharts@2.12.7?bundle"
            );
          } catch (e) {
            console.warn("Failed to load recharts", e);
          }
        }
        // @ts-ignore
        if (!(window as any).__LucideReact__) {
          try {
            // @ts-ignore
            (window as any).__LucideReact__ = await import(
              "https://esm.sh/lucide-react@0.364.0?bundle"
            );
          } catch (e) {
            console.warn("Failed to load lucide-react", e);
          }
        }
        // @ts-ignore
        if (!(window as any).__FramerMotion__) {
          try {
            // @ts-ignore
            (window as any).__FramerMotion__ = await import(
              "https://esm.sh/framer-motion@11.0.24?bundle"
            );
          } catch (e) {
            console.warn("Failed to load framer-motion", e);
          }
        }

        const Babel = (window as any).__babel__;
        const transformed = Babel.transform(code, {
          presets: ["react"],
          filename: "component.tsx",
        }).code;

        // Wrap in module factory
        const moduleCode = `
          const module = { exports: {} };
          const require = async (name) => {
            if (name === 'react') return window.__React__;
            if (name === 'recharts') return window.__Recharts__;
            if (name === 'lucide-react') return window.__LucideReact__;
            if (name === 'framer-motion') return window.__FramerMotion__;
            throw new Error('Cannot require: ' + name);
          };
          // We need an async wrapper to support async requires
          return (async () => {
             ${transformed.replace(/require\(/g, "await require(")}
             return module.exports.default || module.exports;
          })();
        `;

        (window as any).__React__ = React;
        const Component = await new Function(moduleCode)();

        // Clear and render
        container.innerHTML = "";
        const root = createRoot(container);
        root.render(React.createElement(Component));

        window.parent?.postMessage({ type: "RENDER_SUCCESS" }, "*");
      } catch (err: any) {
        container.innerHTML = `
          <div style="padding:16px;font-family:monospace;color:#dc2626;background:#fef2f2;border-radius:8px;margin:16px;font-size:12px;white-space:pre-wrap;">${err?.message ?? String(err)}</div>
        `;
        window.parent?.postMessage(
          { type: "RENDER_ERROR", error: String(err) },
          "*",
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://cdn.tailwindcss.com/3.4.17" />
        <style>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>
      </head>
      <body>
        <div
          ref={containerRef}
          id="root"
          style={{ width: "100%", minHeight: "100vh" }}
        />
      </body>
    </html>
  );
}
