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
import { AnimatePresence, motion } from "framer-motion";
import { PanelRight } from "lucide-react";
import { Button } from "ui/button";

interface Props {
  children: React.ReactNode;
}

type BreakpointMode = "mobile" | "tablet" | "desktop";

function useBreakpoint(): BreakpointMode {
  const [mode, setMode] = useState<BreakpointMode>("desktop");
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setMode(w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mode;
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

  const breakpoint = useBreakpoint();

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

  const handleReopen = useCallback(() => {
    appStore.getState().mutate({ artifactsPanelOpen: true });
  }, []);

  const artifactCount = orderedArtifactIds.length;

  const panel = currentArtifact ? (
    <ArtifactPanel
      artifact={currentArtifact}
      currentIndex={currentIndex}
      totalVersions={orderedArtifactIds.length}
      onVersionChange={handleVersionChange}
      onClose={handleClose}
    />
  ) : null;

  // ── Desktop: side-by-side resizable panels ───────────────────────────────
  if (breakpoint === "desktop") {
    return (
      <div className="relative h-full w-full">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={50} minSize={30}>
            {children}
          </ResizablePanel>

          <AnimatePresence>
            {panelOpen && currentArtifact && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={50} minSize={25} maxSize={70}>
                  <motion.div
                    className="h-full w-full"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {panel}
                  </motion.div>
                </ResizablePanel>
              </>
            )}
          </AnimatePresence>
        </ResizablePanelGroup>

        {/* Reopen button */}
        <AnimatePresence>
          {!panelOpen && artifactCount > 0 && (
            <motion.div
              className="absolute bottom-6 right-6 z-30"
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                onClick={handleReopen}
                variant="secondary"
                size="sm"
                className="gap-2 shadow-lg border"
              >
                <PanelRight className="size-4" />
                Canvas
                {artifactCount > 1 && (
                  <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                    {artifactCount}
                  </span>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Tablet: side overlay at 55% width ────────────────────────────────────
  if (breakpoint === "tablet") {
    return (
      <div className="relative h-full w-full overflow-hidden">
        {children}

        <AnimatePresence>
          {panelOpen && currentArtifact && (
            <>
              {/* Backdrop */}
              <motion.div
                className="absolute inset-0 z-40 bg-black/30 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
              />
              {/* Panel */}
              <motion.div
                className="absolute right-0 top-0 bottom-0 z-50 w-[60%] shadow-2xl"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {panel}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Reopen button */}
        <AnimatePresence>
          {!panelOpen && artifactCount > 0 && (
            <motion.div
              className="absolute bottom-6 right-6 z-30"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Button
                onClick={handleReopen}
                variant="secondary"
                size="sm"
                className="gap-2 shadow-lg border"
              >
                <PanelRight className="size-4" />
                Canvas
                {artifactCount > 1 && (
                  <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                    {artifactCount}
                  </span>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Mobile: bottom sheet ──────────────────────────────────────────────────
  return (
    <div className="relative h-full w-full overflow-hidden">
      {children}

      <AnimatePresence>
        {panelOpen && currentArtifact && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />
            {/* Bottom sheet */}
            <motion.div
              className="fixed left-0 right-0 bottom-0 z-50 h-[90vh] rounded-t-2xl shadow-2xl overflow-hidden bg-background"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 500) {
                  handleClose();
                }
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="h-[calc(90vh-20px)]">{panel}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating reopen button */}
      <AnimatePresence>
        {!panelOpen && artifactCount > 0 && (
          <motion.div
            className="fixed bottom-6 right-6 z-30"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
          >
            <Button
              onClick={handleReopen}
              variant="secondary"
              size="sm"
              className="gap-2 shadow-lg border"
            >
              <PanelRight className="size-4" />
              Canvas
              {artifactCount > 1 && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                  {artifactCount}
                </span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
