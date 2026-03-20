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
    header: string;
    titleSlide: string;
    title: string;
    titleText: string;
    body: string;
    accent: string;
    muted: string;
    bullet: string;
    cardBg: string;
    cardBorder: string;
    chartColors: string[];
  }
> = {
  dark: {
    slide: "bg-gray-950 text-gray-100",
    header: "bg-gray-900 border-b border-gray-800",
    titleSlide: "bg-gray-950 text-white",
    title: "text-white",
    titleText: "text-white",
    body: "text-gray-300",
    accent: "text-blue-500",
    muted: "text-gray-500",
    bullet: "bg-blue-500",
    cardBg: "bg-gray-900",
    cardBorder: "border-gray-800 border-2 shadow-xl shadow-black/50",
    chartColors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
  },
  light: {
    slide: "bg-slate-50 text-slate-900",
    header: "bg-blue-600 border-none",
    titleSlide: "bg-blue-600 text-white",
    title: "text-slate-900",
    titleText: "text-white",
    body: "text-slate-600",
    accent: "text-blue-600",
    muted: "text-slate-400",
    bullet: "bg-blue-600",
    cardBg: "bg-white",
    cardBorder: "border-slate-100 border shadow-md rounded-xl",
    chartColors: ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed"],
  },
  corporate: {
    slide: "bg-[#F4F7F9] text-slate-800",
    header: "bg-[#005B73]",
    titleSlide: "bg-[#005B73] text-white",
    title: "text-[#005B73]",
    titleText: "text-white",
    body: "text-slate-700",
    accent: "text-[#008C99]",
    muted: "text-slate-500",
    bullet: "bg-[#008C99]",
    cardBg: "bg-white",
    cardBorder: "border-[#005B73]/20 border-2 shadow-sm rounded-xl",
    chartColors: ["#005B73", "#008C99", "#4CB1C4", "#FFC72C", "#F26922"],
  },
  minimal: {
    slide: "bg-[#FDFBF7] text-[#2C2C2C]",
    header: "bg-[#E84E36]",
    titleSlide: "bg-[#E84E36] text-white",
    title: "text-[#2C2C2C]",
    titleText: "text-white",
    body: "text-[#4A4A4A]",
    accent: "text-[#E84E36]",
    muted: "text-[#999999]",
    bullet: "bg-[#E84E36]",
    cardBg: "bg-white",
    cardBorder: "border-[#E84E36]/10 border-2 shadow-sm rounded-xl",
    chartColors: ["#E84E36", "#2C2C2C", "#F4A261", "#E76F51", "#2A9D8F"],
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
    <ul className="space-y-4">
      {bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-4">
          <span
            className={cn("mt-2.5 w-2 h-2 rounded-full shrink-0", t.bullet)}
          />
          <span className={cn("text-lg leading-relaxed font-medium", t.body)}>
            {b}
          </span>
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
        <div
          className={cn(
            "flex flex-col items-center justify-center h-full text-center px-16 relative overflow-hidden",
            t.titleSlide,
          )}
        >
          <div
            className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--gradient-color)_0%,_transparent_100%)] block pointer-events-none"
            style={{ "--gradient-color": "currentColor" } as any}
          />
          <h1 className="text-5xl font-extrabold leading-tight mb-6 z-10 max-w-4xl tracking-tight">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p className="text-2xl font-medium opacity-90 z-10 max-w-3xl">
              {slide.subtitle}
            </p>
          )}
        </div>
      );

    case "content":
      return (
        <div className="flex flex-col h-full bg-inherit">
          <div className={cn("px-12 py-6 shrink-0 shadow-sm z-10", t.header)}>
            <h2
              className={cn("text-3xl font-bold tracking-tight", t.titleText)}
            >
              {slide.title}
            </h2>
          </div>
          <div className="flex-1 px-12 py-8 overflow-y-auto">
            <div
              className={cn(
                "h-full rounded-2xl p-8 flex flex-col items-start justify-center",
                t.cardBg,
                t.cardBorder,
              )}
            >
              {slide.body && (
                <p
                  className={cn(
                    "text-lg leading-relaxed mb-6 font-medium",
                    t.body,
                  )}
                >
                  {slide.body}
                </p>
              )}
              {slide.bullets && <BulletList bullets={slide.bullets} t={t} />}
            </div>
          </div>
        </div>
      );

    case "two-column":
      return (
        <div className="flex flex-col h-full bg-inherit">
          {slide.title && (
            <div className={cn("px-12 py-6 shrink-0 shadow-sm z-10", t.header)}>
              <h2
                className={cn("text-3xl font-bold tracking-tight", t.titleText)}
              >
                {slide.title}
              </h2>
            </div>
          )}
          <div className="flex-1 grid grid-cols-2 gap-8 px-12 py-8 overflow-y-auto">
            <div
              className={cn(
                "rounded-2xl p-8 flex flex-col justify-center",
                t.cardBg,
                t.cardBorder,
              )}
            >
              {slide.leftContent && (
                <p
                  className={cn(
                    "text-lg leading-relaxed mb-6 font-medium",
                    t.body,
                  )}
                >
                  {slide.leftContent}
                </p>
              )}
              {slide.leftBullets && (
                <BulletList bullets={slide.leftBullets} t={t} />
              )}
            </div>
            <div
              className={cn(
                "rounded-2xl p-8 flex flex-col justify-center",
                t.cardBg,
                t.cardBorder,
              )}
            >
              {slide.rightContent && (
                <p
                  className={cn(
                    "text-lg leading-relaxed mb-6 font-medium",
                    t.body,
                  )}
                >
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
        <div className="flex flex-col h-full bg-inherit">
          <div className={cn("px-12 py-6 shrink-0 shadow-sm z-10", t.header)}>
            <h2
              className={cn("text-3xl font-bold tracking-tight", t.titleText)}
            >
              {slide.title}
            </h2>
          </div>
          <div className="flex-1 p-8 overflow-y-auto">
            <div
              className={cn(
                "h-full rounded-2xl p-8 flex flex-col items-center justify-center",
                t.cardBg,
                t.cardBorder,
              )}
            >
              {slide.chart ? (
                <div className="w-full h-full min-h-[300px]">
                  <SlideChart chart={slide.chart} colors={t.chartColors} />
                </div>
              ) : (
                <div
                  className={cn("flex flex-col items-center gap-3", t.muted)}
                >
                  <BarChart2 className="size-16 opacity-30" />
                  <span className="text-lg">No chart data</span>
                </div>
              )}
            </div>
          </div>
        </div>
      );

    case "quote":
      return (
        <div className="flex flex-col h-full bg-inherit">
          <div className="flex-1 p-12 overflow-y-auto flex items-center justify-center">
            <div
              className={cn(
                "w-full h-full rounded-3xl p-16 flex flex-col items-center justify-center text-center relative overflow-hidden",
                t.cardBg,
                t.cardBorder,
              )}
            >
              <span
                className={cn(
                  "absolute top-8 left-8 text-9xl font-serif leading-none opacity-10",
                  t.accent,
                )}
              >
                "
              </span>
              <blockquote
                className={cn(
                  "text-3xl leading-relaxed italic mb-8 font-medium relative z-10 max-w-4xl",
                  t.body,
                )}
              >
                {slide.quote ?? slide.body}
              </blockquote>
              {slide.author && (
                <p
                  className={cn(
                    "text-xl font-bold tracking-wide uppercase",
                    t.accent,
                  )}
                >
                  — {slide.author}
                </p>
              )}
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="flex flex-col h-full bg-inherit">
          <div className={cn("px-12 py-6 shrink-0 shadow-sm z-10", t.header)}>
            <h2
              className={cn("text-3xl font-bold tracking-tight", t.titleText)}
            >
              {slide.title}
            </h2>
          </div>
          <div className="flex-1 px-12 py-8 overflow-y-auto">
            <div
              className={cn(
                "h-full rounded-2xl p-8 flex flex-col items-start justify-center",
                t.cardBg,
                t.cardBorder,
              )}
            >
              <p className={cn("text-lg font-medium", t.body)}>{slide.body}</p>
            </div>
          </div>
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
