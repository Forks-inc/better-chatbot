"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  BarChart2,
} from "lucide-react";
import { Button } from "ui/button";
import type { Artifact } from "@/types/artifact";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type SlideLayout =
  | "title"
  | "content"
  | "two-column"
  | "chart"
  | "quote"
  | "image";
type PresentationTheme = "dark" | "light" | "corporate" | "minimal";

interface SlideChart {
  type: "bar" | "line" | "pie";
  data: { name: string; value: number; [k: string]: any }[];
}

interface Slide {
  id: string;
  layout: SlideLayout;
  title?: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  leftContent?: string;
  rightContent?: string;
  leftBullets?: string[];
  rightBullets?: string[];
  quote?: string;
  author?: string;
  chart?: SlideChart;
  notes?: string;
  accent?: string;
}

interface PresentationData {
  title: string;
  theme?: PresentationTheme;
  slides: Slide[];
}

// ─── Theme config ─────────────────────────────────────────────────────────────

const THEMES: Record<
  PresentationTheme,
  {
    slide: string;
    titleBg: string;
    title: string;
    body: string;
    accent: string;
    muted: string;
    bullet: string;
    chartColors: string[];
  }
> = {
  dark: {
    slide: "bg-gray-900 text-white",
    titleBg: "bg-gray-800",
    title: "text-white",
    body: "text-gray-200",
    accent: "text-blue-400",
    muted: "text-gray-400",
    bullet: "bg-blue-400",
    chartColors: ["#60a5fa", "#34d399", "#f59e0b", "#f87171", "#a78bfa"],
  },
  light: {
    slide: "bg-white text-gray-900",
    titleBg: "bg-gray-50",
    title: "text-gray-900",
    body: "text-gray-700",
    accent: "text-blue-600",
    muted: "text-gray-500",
    bullet: "bg-blue-600",
    chartColors: ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed"],
  },
  corporate: {
    slide: "bg-slate-800 text-white",
    titleBg: "bg-blue-900",
    title: "text-white",
    body: "text-slate-200",
    accent: "text-cyan-400",
    muted: "text-slate-400",
    bullet: "bg-cyan-400",
    chartColors: ["#22d3ee", "#38bdf8", "#818cf8", "#fb923c", "#34d399"],
  },
  minimal: {
    slide: "bg-stone-50 text-stone-800",
    titleBg: "bg-stone-100",
    title: "text-stone-900",
    body: "text-stone-600",
    accent: "text-stone-900",
    muted: "text-stone-400",
    bullet: "bg-stone-800",
    chartColors: ["#292524", "#44403c", "#78716c", "#a8a29e", "#d6d3d1"],
  },
};

// ─── Slide renderers ──────────────────────────────────────────────────────────

function BulletList({
  bullets,
  t,
}: {
  bullets: string[];
  t: (typeof THEMES)[PresentationTheme];
}) {
  return (
    <ul className="space-y-3 mt-2">
      {bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-3">
          <span
            className={cn("mt-2 w-1.5 h-1.5 rounded-full shrink-0", t.bullet)}
          />
          <span className={cn("text-base leading-relaxed", t.body)}>{b}</span>
        </li>
      ))}
    </ul>
  );
}

function SlideChart({
  chart,
  colors,
}: { chart: SlideChart; colors: string[] }) {
  if (chart.type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chart.data}>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <Tooltip />
          <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  if (chart.type === "line") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chart.data}>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors[0]}
            strokeWidth={2}
            dot={{ fill: colors[0] }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (chart.type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chart.data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {chart.data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  return null;
}

function renderSlide(slide: Slide, t: (typeof THEMES)[PresentationTheme]) {
  switch (slide.layout) {
    case "title":
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-16">
          <h1 className={cn("text-4xl font-bold leading-tight mb-4", t.title)}>
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p className={cn("text-xl", t.muted)}>{slide.subtitle}</p>
          )}
        </div>
      );

    case "content":
      return (
        <div className="flex flex-col h-full px-12 py-8">
          <h2 className={cn("text-2xl font-bold mb-6", t.title)}>
            {slide.title}
          </h2>
          {slide.body && (
            <p className={cn("text-base leading-relaxed mb-4", t.body)}>
              {slide.body}
            </p>
          )}
          {slide.bullets && <BulletList bullets={slide.bullets} t={t} />}
        </div>
      );

    case "two-column":
      return (
        <div className="flex flex-col h-full px-12 py-8">
          {slide.title && (
            <h2 className={cn("text-2xl font-bold mb-6", t.title)}>
              {slide.title}
            </h2>
          )}
          <div className="flex-1 grid grid-cols-2 gap-8">
            <div>
              {slide.leftContent && (
                <p className={cn("text-sm leading-relaxed mb-3", t.body)}>
                  {slide.leftContent}
                </p>
              )}
              {slide.leftBullets && (
                <BulletList bullets={slide.leftBullets} t={t} />
              )}
            </div>
            <div>
              {slide.rightContent && (
                <p className={cn("text-sm leading-relaxed mb-3", t.body)}>
                  {slide.rightContent}
                </p>
              )}
              {slide.rightBullets && (
                <BulletList bullets={slide.rightBullets} t={t} />
              )}
            </div>
          </div>
        </div>
      );

    case "chart":
      return (
        <div className="flex flex-col h-full px-12 py-8">
          <h2 className={cn("text-2xl font-bold mb-4", t.title)}>
            {slide.title}
          </h2>
          {slide.chart && (
            <div className="flex-1 flex items-center">
              <div className="w-full">
                <SlideChart chart={slide.chart} colors={t.chartColors} />
              </div>
            </div>
          )}
          {!slide.chart && (
            <div className="flex-1 flex items-center justify-center">
              <div className={cn("flex flex-col items-center gap-2", t.muted)}>
                <BarChart2 className="size-12 opacity-30" />
                <span className="text-sm">No chart data</span>
              </div>
            </div>
          )}
        </div>
      );

    case "quote":
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-16">
          <span
            className={cn(
              "text-7xl font-serif leading-none mb-4 opacity-30",
              t.accent,
            )}
          >
            "
          </span>
          <blockquote
            className={cn("text-xl leading-relaxed italic mb-6", t.body)}
          >
            {slide.quote ?? slide.body}
          </blockquote>
          {slide.author && (
            <p className={cn("text-sm font-medium", t.muted)}>
              — {slide.author}
            </p>
          )}
        </div>
      );

    default:
      return (
        <div className="flex flex-col h-full px-12 py-8">
          <h2 className={cn("text-2xl font-bold mb-4", t.title)}>
            {slide.title}
          </h2>
          <p className={cn("text-base", t.body)}>{slide.body}</p>
        </div>
      );
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  artifact: Artifact;
}

export function PresentationPreview({ artifact }: Props) {
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const data: PresentationData | null = useMemo(() => {
    try {
      return JSON.parse(artifact.content ?? "{}") as PresentationData;
    } catch {
      return null;
    }
  }, [artifact.content]);

  const theme = (data?.theme ?? "dark") as PresentationTheme;
  const t = THEMES[theme] ?? THEMES.dark;
  const slides = data?.slides ?? [];
  const total = slides.length;
  const slide = slides[current];

  const prev = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);
  const next = useCallback(
    () => setCurrent((c) => Math.min(total - 1, c + 1)),
    [total],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  if (!data || !slides.length) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
        No presentation data available
      </div>
    );
  }

  const slideContent = (
    <div
      className={cn(
        "flex flex-col w-full h-full select-none",
        fullscreen && "fixed inset-0 z-50",
        t.slide,
      )}
    >
      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Slide number badge */}
        <div className="absolute top-4 right-4 z-10 text-xs font-mono opacity-40">
          {current + 1} / {total}
        </div>

        {slide && renderSlide(slide, t)}
      </div>

      {/* Controls bar */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2 border-t shrink-0",
          theme === "dark" || theme === "corporate"
            ? "border-white/10 bg-black/20"
            : "border-black/10 bg-black/5",
        )}
      >
        {/* Slide thumbnails dots */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[60%]">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={cn(
                "w-2 h-2 rounded-full transition-all shrink-0",
                idx === current
                  ? t.bullet + " scale-125"
                  : "bg-current opacity-25 hover:opacity-50",
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-7 opacity-70 hover:opacity-100"
            onClick={prev}
            disabled={current === 0}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 opacity-70 hover:opacity-100"
            onClick={next}
            disabled={current === total - 1}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 opacity-70 hover:opacity-100"
            onClick={() => setFullscreen((f) => !f)}
          >
            {fullscreen ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Speaker notes */}
      {slide?.notes && !fullscreen && (
        <div
          className={cn(
            "px-4 py-2 text-xs border-t shrink-0 max-h-16 overflow-auto",
            theme === "dark" || theme === "corporate"
              ? "border-white/10 bg-black/30 text-gray-400"
              : "border-black/10 bg-black/5 text-gray-500",
          )}
        >
          <span className="font-semibold mr-1">Notes:</span>
          {slide.notes}
        </div>
      )}
    </div>
  );

  return slideContent;
}
