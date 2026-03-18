import { tool as createTool } from "ai";
import { z } from "zod";
import { generateUUID } from "lib/utils";

const slideSchema = z.object({
  id: z.string().optional(),
  layout: z
    .enum(["title", "content", "two-column", "chart", "quote", "image"])
    .describe("Slide layout type"),
  title: z.string().optional().describe("Slide title"),
  subtitle: z.string().optional().describe("Subtitle (for title slides)"),
  body: z.string().optional().describe("Main body text paragraph"),
  bullets: z.array(z.string()).optional().describe("Bullet points list"),
  leftContent: z
    .string()
    .optional()
    .describe("Left column text (two-column layout)"),
  rightContent: z
    .string()
    .optional()
    .describe("Right column text (two-column layout)"),
  leftBullets: z
    .array(z.string())
    .optional()
    .describe("Left column bullets (two-column layout)"),
  rightBullets: z
    .array(z.string())
    .optional()
    .describe("Right column bullets (two-column layout)"),
  quote: z.string().optional().describe("Quote text (quote layout)"),
  author: z.string().optional().describe("Quote author (quote layout)"),
  chart: z
    .object({
      type: z.enum(["bar", "line", "pie"]),
      data: z.array(
        z.object({ name: z.string(), value: z.number() }).passthrough(),
      ),
    })
    .optional()
    .describe("Chart data (chart layout)"),
  notes: z.string().optional().describe("Speaker notes for this slide"),
});

export const createPresentationTool = createTool({
  description: `Create a visual slide presentation. Use this when the user asks to create a presentation, slides, PowerPoint, or a deck.
- Use layout "title" for the opening/closing slide with a big title and subtitle
- Use layout "content" for slides with text and/or bullet points
- Use layout "two-column" to compare two ideas side by side
- Use layout "chart" when showing data visualizations (bar, line, pie)
- Use layout "quote" for impactful quotes or key statements
- Always start with a "title" layout slide and end with a closing slide
- Choose theme based on context: "corporate" for business, "dark" for tech, "light" for academic, "minimal" for creative`,
  inputSchema: z.object({
    title: z.string().describe("Presentation title"),
    theme: z
      .enum(["dark", "light", "corporate", "minimal"])
      .default("corporate")
      .describe("Visual theme"),
    slides: z.array(slideSchema).describe("Array of slides (minimum 3)"),
  }),
  execute: async ({ title, theme, slides }) => {
    const artifactId = generateUUID();
    const data = {
      title,
      theme,
      slides: slides.map((s, i) => ({ ...s, id: s.id ?? String(i + 1) })),
    };
    return {
      artifactId,
      type: "application/vnd.presentation" as const,
      title,
      content: JSON.stringify(data),
      language: "json",
    };
  },
});
