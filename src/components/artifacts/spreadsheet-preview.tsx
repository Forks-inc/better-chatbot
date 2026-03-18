"use client";

import { useState, useMemo } from "react";
import { cn } from "lib/utils";
import { ChevronUp, ChevronDown, Search } from "lucide-react";
import type { Artifact } from "@/types/artifact";

interface SheetData {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
  formats?: Record<
    string,
    "currency" | "date" | "number" | "percent" | "string"
  >;
}

interface SpreadsheetData {
  sheets: SheetData[];
}

function formatCell(
  value: string | number | null,
  format?: "currency" | "date" | "number" | "percent" | "string",
): string {
  if (value === null || value === undefined) return "";
  if (format === "currency") {
    const num = Number(value);
    return isNaN(num)
      ? String(value)
      : `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (format === "percent") {
    const num = Number(value);
    return isNaN(num) ? String(value) : `${num}%`;
  }
  if (format === "number") {
    const num = Number(value);
    return isNaN(num) ? String(value) : num.toLocaleString();
  }
  if (format === "date") {
    try {
      return new Date(String(value)).toLocaleDateString();
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function SheetTable({ sheet }: { sheet: SheetData }) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");

  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colIdx);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let rows = sheet.rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        row.some((cell) =>
          String(cell ?? "")
            .toLowerCase()
            .includes(q),
        ),
      );
    }
    if (sortCol !== null) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortCol] ?? "";
        const bv = b[sortCol] ?? "";
        const aNum = Number(av);
        const bNum = Number(bv);
        const isNum = !isNaN(aNum) && !isNaN(bNum);
        const cmp = isNum ? aNum - bNum : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [sheet.rows, search, sortCol, sortDir]);

  // Detect column format from header name (column letter key A, B, C...)
  const getColFormat = (idx: number) => {
    const key = String.fromCharCode(65 + idx); // A, B, C...
    return sheet.formats?.[key];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <Search className="size-3.5 text-muted-foreground shrink-0" />
        <input
          className="text-xs bg-transparent outline-none flex-1 placeholder:text-muted-foreground"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {filtered.length !== sheet.rows.length && (
          <span className="text-xs text-muted-foreground">
            {filtered.length}/{sheet.rows.length}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {/* Row number header */}
              <th className="w-10 border-r border-b bg-muted px-2 py-1.5 text-muted-foreground font-normal text-center">
                #
              </th>
              {sheet.headers.map((header, idx) => (
                <th
                  key={idx}
                  className="border-r border-b bg-muted px-3 py-1.5 text-left font-semibold text-foreground cursor-pointer hover:bg-muted/80 select-none whitespace-nowrap"
                  onClick={() => handleSort(idx)}
                >
                  <div className="flex items-center gap-1">
                    <span>{header}</span>
                    {sortCol === idx ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="size-3" />
                      ) : (
                        <ChevronDown className="size-3" />
                      )
                    ) : (
                      <ChevronDown className="size-3 opacity-20" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={sheet.headers.length + 1}
                  className="text-center text-muted-foreground py-8"
                >
                  No results
                </td>
              </tr>
            ) : (
              filtered.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={cn(
                    "border-b hover:bg-muted/40 transition-colors",
                    rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20",
                  )}
                >
                  <td className="border-r px-2 py-1 text-center text-muted-foreground">
                    {rowIdx + 1}
                  </td>
                  {sheet.headers.map((_, colIdx) => {
                    const fmt = getColFormat(colIdx);
                    const val = row[colIdx] ?? null;
                    const isNumeric =
                      fmt === "currency" ||
                      fmt === "number" ||
                      fmt === "percent" ||
                      (!isNaN(Number(val)) && val !== null && val !== "");
                    return (
                      <td
                        key={colIdx}
                        className={cn(
                          "border-r px-3 py-1 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis",
                          isNumeric ? "text-right font-mono" : "text-left",
                          fmt === "currency" &&
                            "text-green-600 dark:text-green-400",
                        )}
                      >
                        {formatCell(val, fmt)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-3">
        <span>{filtered.length} rows</span>
        <span>·</span>
        <span>{sheet.headers.length} columns</span>
      </div>
    </div>
  );
}

interface Props {
  artifact: Artifact;
}

export function SpreadsheetPreview({ artifact }: Props) {
  const [activeSheet, setActiveSheet] = useState(0);

  const data: SpreadsheetData | null = useMemo(() => {
    try {
      return JSON.parse(artifact.content ?? "{}") as SpreadsheetData;
    } catch {
      return null;
    }
  }, [artifact.content]);

  if (!data || !data.sheets?.length) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
        No spreadsheet data available
      </div>
    );
  }

  const sheet = data.sheets[activeSheet];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Sheet tabs */}
      {data.sheets.length > 1 && (
        <div className="flex gap-0 border-b bg-muted/30 overflow-x-auto shrink-0">
          {data.sheets.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSheet(idx)}
              className={cn(
                "px-4 py-2 text-xs font-medium whitespace-nowrap border-r transition-colors",
                activeSheet === idx
                  ? "bg-background text-foreground border-b-2 border-b-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <SheetTable sheet={sheet} />
      </div>
    </div>
  );
}
