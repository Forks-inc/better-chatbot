"use client";

import type { Artifact } from "@/types/artifact";
import { motion } from "framer-motion";
import { buttonTap, staggerItem } from "lib/animations";
import { cn } from "lib/utils";
import { Code, ExternalLink } from "lucide-react";

interface Props {
  artifact: Artifact;
  onClick: () => void;
  className?: string;
}

export function ArtifactButton({ artifact, onClick, className }: Props) {
  const langLabel = artifact.language ?? artifact.type;

  return (
    <motion.button
      onClick={onClick}
      variants={staggerItem}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      className={cn(
        "group relative overflow-hidden flex items-center gap-3 w-full max-w-md rounded-xl glass-card p-3 text-left transition-all",
        className,
      )}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        variants={buttonTap}
      />
      <motion.div
        variants={buttonTap}
        className="flex relative z-10 size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm group-hover:shadow-md group-hover:shadow-primary/20 transition-all duration-200"
      >
        <Code className="size-4" />
      </motion.div>
      <div className="flex-1 min-w-0 relative z-10">
        <motion.p variants={buttonTap} className="text-sm font-medium truncate">
          {artifact.title}
        </motion.p>
        <motion.p
          variants={buttonTap}
          className="text-xs text-muted-foreground"
        >
          {langLabel}
        </motion.p>
      </div>
      <motion.div
        variants={buttonTap}
        className="relative z-10 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
      >
        <ExternalLink className="size-4" />
      </motion.div>
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"
        variants={buttonTap}
      />
    </motion.button>
  );
}
