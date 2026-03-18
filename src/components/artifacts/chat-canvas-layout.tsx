"use client";

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

  const handleClose = () => {
    mutate({ artifactsPanelOpen: false });
  };

  if (!panelOpen || !currentArtifact) {
    return <>{children}</>;
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={50} minSize={30}>
        {children}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={25}>
        <ArtifactPanel
          artifact={currentArtifact}
          currentIndex={currentIndex}
          totalVersions={orderedArtifactIds.length}
          onVersionChange={handleVersionChange}
          onClose={handleClose}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
