"use client";

import type { Artifact } from "@/types/artifact";

interface Props {
  artifact: Artifact;
}

export function SvgPreview({ artifact }: Props) {
  return (
    <div className="flex h-full w-full items-center justify-center p-4 bg-background overflow-hidden relative">
      {/* Checkered background pattern to show transparency */}
      <div
        className="absolute inset-0 z-0 opacity-5 dark:opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #808080 25%, transparent 25%, transparent 75%, #808080 75%, #808080), repeating-linear-gradient(45deg, #808080 25%, transparent 25%, transparent 75%, #808080 75%, #808080)",
          backgroundPosition: "0 0, 10px 10px",
          backgroundSize: "20px 20px",
        }}
      />
      <div
        className="relative z-10 w-full h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto flex items-center justify-center pointer-events-none"
        dangerouslySetInnerHTML={{ __html: artifact.content }}
      />
    </div>
  );
}
