"use client";

import { type Variants } from "framer-motion";

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export const buttonTap: Variants = {
  tap: { scale: 0.96, transition: { duration: 0.1 } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export const pulse: Variants = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.02, 1], transition: { duration: 0.3 } },
};

export const shimmer: Variants = {
  initial: { backgroundPosition: "200% 0" },
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: { duration: 2, repeat: Infinity, ease: "linear" },
  },
};

export const glowPulse: Variants = {
  initial: { boxShadow: "0 0 0 0 rgba(59, 130, 246, 0)" },
  animate: {
    boxShadow: [
      "0 0 0 0 rgba(59, 130, 246, 0)",
      "0 0 20px 2px rgba(59, 130, 246, 0.3)",
      "0 0 0 0 rgba(59, 130, 246, 0)",
    ],
    transition: { duration: 2, repeat: Infinity },
  },
};

export const bounceIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

export const tabSwitch: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

export const iconBounce: Variants = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.2, 1], transition: { duration: 0.4 } },
};
