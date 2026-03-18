"use client";

import { useState, useMemo, Suspense, lazy, useCallback } from "react";
import { RefreshCw, Search } from "lucide-react";
import type { Artifact } from "@/types/artifact";

// react-data-grid loaded lazily so styles can be imported once in globals.css
const DataGrid = lazy(() =>
  import("react-data-grid").then((m) => ({ default: m.DataGrid })),
);

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

const FORMAT_MAP: Record<string, (v: any) => string> = {
  currency: (v) => {
    const n = Number(v);
    return isNaN(n)
      ? String(v)
      : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },
  percent: (v) => {
    const n = Number(v);
    return isNaN(n) ? String(v) : `${n}%`;
  },
  number: (v) => {
    const n = Number(v);
    return isNaN(n) ? String(v) : n.toLocaleString();
  },
  date: (v) => {
    try {
      return new Date(String(v)).toLocaleDateString();
    } catch {
      return String(v);
    }
  },
  string: (v) => String(v ?? ""),
};

/** Auto-calculate column width based on content (Pixelle-Studio pattern) */
function calcColWidth(
  headerName: string,
  colData: (string | number | null)[],
): number {
  const CHAR_WIDTH = 9;
  const PADDING = 24;
  const MIN = 80;
  const MAX = 320;
  const sample = colData.slice(0, 100);
  let maxLen = String(headerName ?? "").length;
  for (const cell of sample) {
    maxLen = Math.max(maxLen, String(cell ?? "").length);
  }
  return Math.min(Math.max(maxLen * CHAR_WIDTH + PADDING, MIN), MAX);
}

type RowData = Record<string, string>;

function buildGridData(sheet: SheetData) {
  const colLetterFmt = (idx: number) =>
    sheet.formats?.[String.fromCharCode(65 + idx)];

  const columns: import("react-data-grid").Column<RowData>[] =
    sheet.headers.map((h, idx) => {
      const fmt = colLetterFmt(idx);
      const colData = sheet.rows.map((r) => r[idx]);
      return {
        key: `col_${idx}`,
        name: h,
        resizable: true,
        sortable: true,
        width: calcColWidth(h, colData),
        minWidth: 60,
        renderCell: ({
          row,
        }: import("react-data-grid").RenderCellProps<RowData>) => {
          const raw = row[`col_${idx}`];
          const formatted =
            fmt && FORMAT_MAP[fmt] ? FORMAT_MAP[fmt](raw) : (raw ?? "");
          const isNum =
            fmt === "currency" ||
            fmt === "number" ||
            fmt === "percent" ||
            (!isNaN(Number(raw)) && raw !== "" && raw !== null);
          return (
            <div
              title={String(formatted)}
              style={{
                textAlign: isNum ? "right" : "left",
                color:
                  fmt === "currency"
                    ? "var(--color-green-500, #22c55e)"
                    : undefined,
                fontFamily: isNum ? "var(--font-mono, monospace)" : undefined,
                padding: "0 8px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {String(formatted)}
            </div>
          );
        },
      };
    });

  const rows = sheet.rows.map((row, rowIdx) => {
    const obj: Record<string, string> = { _id: String(rowIdx) };
    sheet.headers.forEach((_, idx) => {
      obj[`col_${idx}`] = String(row[idx] ?? "");
    });
    return obj;
  });

  return { columns, rows };
}

interface Props {
  artifact: Artifact;
}

export function SpreadsheetPreview({ artifact }: Props) {
  const [activeSheet, setActiveSheet] = useState(0);
  const [search, setSearch] = useState("");
  const [sortColumns, setSortColumns] = useState<
    { columnKey: string; direction: "ASC" | "DESC" }[]
  >([]);

  const data: SpreadsheetData | null = useMemo(() => {
    try {
      return JSON.parse(artifact.content ?? "{}") as SpreadsheetData;
    } catch {
      return null;
    }
  }, [artifact.content]);

  const sheet = data?.sheets?.[activeSheet];

  const { columns, rows } = useMemo(
    () => (sheet ? buildGridData(sheet) : { columns: [], rows: [] }),
    [sheet],
  );

  const filteredRows = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    if (sortColumns.length > 0) {
      const { columnKey, direction } = sortColumns[0];
      result = [...result].sort((a, b) => {
        const av = a[columnKey] ?? "";
        const bv = b[columnKey] ?? "";
        const an = Number(av),
          bn = Number(bv);
        const isNum = !isNaN(an) && !isNaN(bn);
        const cmp = isNum ? an - bn : String(av).localeCompare(String(bv));
        return direction === "ASC" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, sortColumns]);

  const handleSortColumnsChange = useCallback(
    (cols: { columnKey: string; direction: "ASC" | "DESC" }[]) =>
      setSortColumns(cols),
    [],
  );

  if (!data?.sheets?.length) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
        No spreadsheet data available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Sheet tabs */}
      {data.sheets.length > 1 && (
        <div className="flex gap-0 border-b bg-muted/30 overflow-x-auto shrink-0">
          {data.sheets.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveSheet(idx);
                setSearch("");
                setSortColumns([]);
              }}
              className={`px-4 py-1.5 text-xs font-medium whitespace-nowrap border-r transition-colors ${
                activeSheet === idx
                  ? "bg-background text-foreground border-b-2 border-b-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Search bar */}
      <div className="px-3 py-1.5 border-b flex items-center gap-2 shrink-0 bg-muted/10">
        <Search className="size-3.5 text-muted-foreground shrink-0" />
        <input
          className="text-xs bg-transparent outline-none flex-1 placeholder:text-muted-foreground"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <span className="text-xs text-muted-foreground">
            {filteredRows.length}/{rows.length}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
              <RefreshCw className="size-4 animate-spin" />
              <span className="text-sm">Loading grid...</span>
            </div>
          }
        >
          <DataGrid
            columns={columns as any}
            rows={filteredRows as any}
            rowKeyGetter={(r: any) => (r as RowData)._id}
            className="rdg-light"
            style={{ height: "100%", blockSize: "100%" }}
            sortColumns={sortColumns}
            onSortColumnsChange={handleSortColumnsChange}
            defaultColumnOptions={{ resizable: true, sortable: true }}
          />
        </Suspense>
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-1 text-xs text-muted-foreground flex items-center gap-3 shrink-0">
        <span>{filteredRows.length} rows</span>
        <span>·</span>
        <span>{columns.length} columns</span>
        {sheet?.name && (
          <>
            <span>·</span>
            <span>{sheet.name}</span>
          </>
        )}
      </div>
    </div>
  );
}
