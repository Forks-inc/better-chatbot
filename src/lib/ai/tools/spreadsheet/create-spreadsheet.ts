import { tool as createTool } from "ai";
import { z } from "zod";
import { generateUUID } from "lib/utils";

const sheetSchema = z.object({
  name: z.string().describe("Sheet tab name"),
  headers: z.array(z.string()).describe("Column header names"),
  rows: z
    .array(z.array(z.union([z.string(), z.number(), z.null()])))
    .describe("Data rows; each row is an array of values matching the headers"),
  formats: z
    .record(
      z.string(),
      z.enum(["currency", "date", "number", "percent", "string"]),
    )
    .optional()
    .describe(
      'Column letter to format mapping (e.g. {"B": "currency", "C": "date"})',
    ),
});

export const createSpreadsheetTool = createTool({
  description: `Create an Excel spreadsheet (.xlsx). Use this when the user asks for a table, spreadsheet, Excel file, or structured data in rows and columns.
- Use "currency" format for money columns
- Use "date" format for date columns
- Use "number" format for large integers
- Use "percent" format for percentage columns
- Multiple sheets are supported — use them to organize related data
- Always use clear, descriptive column headers`,
  inputSchema: z.object({
    sheets: z
      .array(sheetSchema)
      .min(1)
      .describe("One or more sheets in the workbook"),
  }),
  execute: async ({ sheets }) => {
    const artifactId = generateUUID();
    const title =
      sheets.length === 1
        ? sheets[0].name
        : `${sheets[0].name} (+ ${sheets.length - 1} more)`;
    return {
      artifactId,
      type: "application/vnd.spreadsheet" as const,
      title,
      content: JSON.stringify({ sheets }),
      language: "json",
    };
  },
});
