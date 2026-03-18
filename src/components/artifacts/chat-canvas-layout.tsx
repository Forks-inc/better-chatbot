"use client";

import { useCallback, useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { appStore } from "@/app/store";
import { ArtifactPanel } from "@/components/artifacts/artifact-panel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "ui/resizable";

interface Props {
  children: React.ReactNode;
}

export function ChatCanvasLayout({ children }: Props) {
  const [artifacts, currentArtifactId, panelOpen, mutate] = appStore(
    useShallow((s) => [
      s.artifacts,
      s.currentArtifactId,
      s.artifactsPanelOpen,
      s.mutate,
    ]),
  );

  // Detect if viewport is small (mobile/tablet)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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

  const handleVersionChange = (index: number) => {
    const target = orderedArtifactIds[index];
    if (target) {
      mutate({ currentArtifactId: target });
    }
  };

  const handleClose = useCallback(() => {
    appStore.getState().mutate({ artifactsPanelOpen: false });
  }, []);

  if (!panelOpen || !currentArtifact) {
    return <>{children}</>;
  }

  const panel = (
    <ArtifactPanel
      artifact={currentArtifact}
      currentIndex={currentIndex}
      totalVersions={orderedArtifactIds.length}
      onVersionChange={handleVersionChange}
      onClose={handleClose}
    />
  );

  // Mobile: overlay the panel full-screen on top of the chat
  if (isMobile) {
    return (
      <>
        {children}
        <div className="fixed inset-0 z-50 bg-background">{panel}</div>
      </>
    );
  }

  // Desktop: side-by-side resizable panels
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={50} minSize={30}>
        {children}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={25}>
        {panel}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
