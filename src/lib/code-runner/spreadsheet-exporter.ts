/**
 * Generates Python code that runs via Pyodide to export a spreadsheet JSON
 * to a .xlsx file and returns it as a base64 data URI.
 */
export function buildXlsxExporterCode(spreadsheetJson: string): string {
  const escaped = JSON.stringify(spreadsheetJson);
  return `
import micropip
await micropip.install("openpyxl")

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers
from openpyxl.utils import get_column_letter
import json, base64, io

data = json.loads(${escaped})
sheets = data.get("sheets", [])

wb = openpyxl.Workbook()
wb.remove(wb.active)  # remove default sheet

HEADER_FILL = PatternFill("solid", fgColor="1E3A5F")
HEADER_FONT = Font(bold=True, color="FFFFFF", size=11)
ALT_FILL    = PatternFill("solid", fgColor="F0F4F8")
BORDER_SIDE = Side(style="thin", color="D1D5DB")
CELL_BORDER = Border(
    left=BORDER_SIDE, right=BORDER_SIDE,
    top=BORDER_SIDE,  bottom=BORDER_SIDE
)

FORMAT_MAP = {
    "currency": '"$"#,##0.00',
    "number":   "#,##0",
    "percent":  "0.00%",
    "date":     "YYYY-MM-DD",
    "string":   "@",
}

for sheet_data in sheets:
    ws = wb.create_sheet(title=sheet_data.get("name", "Sheet"))
    headers = sheet_data.get("headers", [])
    rows    = sheet_data.get("rows", [])
    formats = sheet_data.get("formats", {})  # {"A": "currency", "B": "date", ...}

    # Write headers
    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font   = HEADER_FONT
        cell.fill   = HEADER_FILL
        cell.border = CELL_BORDER
        cell.alignment = Alignment(horizontal="center", vertical="center")

    # Freeze header row
    ws.freeze_panes = "A2"

    # Write data rows
    for row_idx, row in enumerate(rows, start=2):
        fill = ALT_FILL if row_idx % 2 == 0 else None
        for col_idx, value in enumerate(row, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.border = CELL_BORDER
            cell.alignment = Alignment(vertical="center")
            if fill:
                cell.fill = fill
            # Apply column format
            col_letter = get_column_letter(col_idx)
            fmt = formats.get(col_letter)
            if fmt and fmt in FORMAT_MAP:
                cell.number_format = FORMAT_MAP[fmt]

    # Auto-fit column widths (approximate)
    for col_idx, header in enumerate(headers, start=1):
        col_letter = get_column_letter(col_idx)
        max_len = len(str(header))
        for row in rows:
            if col_idx - 1 < len(row):
                max_len = max(max_len, len(str(row[col_idx - 1] or "")))
        ws.column_dimensions[col_letter].width = min(max_len + 4, 40)

    # Row height for header
    ws.row_dimensions[1].height = 20

buf = io.BytesIO()
wb.save(buf)
buf.seek(0)
print("data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + base64.b64encode(buf.read()).decode())
`.trim();
}
