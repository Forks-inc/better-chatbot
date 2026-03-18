"use client";

import { Code, ExternalLink } from "lucide-react";
import { cn } from "lib/utils";
import type { Artifact } from "@/types/artifact";

interface Props {
  artifact: Artifact;
  onClick: () => void;
  className?: string;
}

export function ArtifactButton({ artifact, onClick, className }: Props) {
  const langLabel = artifact.language ?? artifact.type;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 w-full max-w-md rounded-xl border border-border bg-muted/40 p-3 text-left transition-all hover:bg-muted/80 hover:border-primary/30 hover:shadow-sm",
        className,
      )}
    >
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Code className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{artifact.title}</p>
        <p className="text-xs text-muted-foreground">{langLabel}</p>
      </div>
      <ExternalLink className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
