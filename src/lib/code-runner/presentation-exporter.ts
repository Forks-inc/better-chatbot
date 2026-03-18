/**
 * Generates Python code that runs via Pyodide to export a presentation JSON
 * to a .pptx file and returns it as a base64 data URI.
 */
export function buildPptxExporterCode(presentationJson: string): string {
  const escaped = JSON.stringify(presentationJson);
  return `
import micropip
await micropip.install("python-pptx")

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.chart.data import ChartData
from pptx.enum.chart import XL_CHART_TYPE
from pptx.oxml.ns import qn
from lxml import etree
import copy, json, base64, io

data = json.loads(${escaped})
slides_data = data.get("slides", [])
theme = data.get("theme", "corporate")

# ── Theme palettes ─────────────────────────────────────────────────────────
PALETTES = {
  "dark":      {"bg": (0x0f,0x17,0x2a), "bg2": (0x1e,0x29,0x3b), "title": (0xff,0xff,0xff), "body": (0xe2,0xe8,0xf0), "accent": (0x60,0xa5,0xfa), "muted": (0x94,0xa3,0xb8), "chart": [(0x60,0xa5,0xfa),(0x34,0xd3,0x99),(0xf5,0x9e,0x0b),(0xf8,0x71,0x71),(0xa7,0x8b,0xfa)]},
  "light":     {"bg": (0xff,0xff,0xff), "bg2": (0xf1,0xf5,0xf9), "title": (0x0f,0x17,0x2a), "body": (0x33,0x4a,0x5e), "accent": (0x25,0x63,0xeb), "muted": (0x64,0x74,0x8b), "chart": [(0x25,0x63,0xeb),(0x16,0xa3,0x4a),(0xd9,0x77,0x06),(0xdc,0x26,0x26),(0x7c,0x3a,0xed)]},
  "corporate": {"bg": (0x09,0x13,0x2d), "bg2": (0x0e,0x2a,0x5c), "title": (0xff,0xff,0xff), "body": (0xcc,0xdb,0xf0), "accent": (0x00,0xb4,0xd8), "muted": (0x90,0xa8,0xcc), "chart": [(0x00,0xb4,0xd8),(0x90,0xe0,0xef),(0x03,0x04,0x5e),(0x48,0xca,0xe4),(0x00,0x77,0xb6)]},
  "minimal":   {"bg": (0xfa,0xfa,0xf9), "bg2": (0xf5,0xf5,0xf4), "title": (0x1c,0x19,0x17), "body": (0x44,0x40,0x3c), "accent": (0x1c,0x19,0x17), "muted": (0x78,0x71,0x6c), "chart": [(0x29,0x25,0x24),(0x57,0x53,0x4e),(0x78,0x71,0x6c),(0xa8,0xa2,0x9e),(0xd6,0xd3,0xd1)]},
}
p = PALETTES.get(theme, PALETTES["corporate"])

def rgb(t): return RGBColor(t[0], t[1], t[2])

prs = Presentation()
prs.slide_width  = Inches(13.33)
prs.slide_height = Inches(7.5)
blank = prs.slide_layouts[6]

W = prs.slide_width
H = prs.slide_height

# ── Helpers ────────────────────────────────────────────────────────────────
def set_bg(slide, color_tuple):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = rgb(color_tuple)

def add_rect(slide, left, top, width, height, color_tuple):
    shape = slide.shapes.add_shape(1, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb(color_tuple)
    shape.line.fill.background()
    return shape

def add_tb(slide, text, left, top, width, height,
           size=18, bold=False, color=None, align=PP_ALIGN.LEFT, wrap=True):
    if not text:
        return
    txb = slide.shapes.add_textbox(left, top, width, height)
    tf  = txb.text_frame
    tf.word_wrap = wrap
    p_obj = tf.paragraphs[0]
    p_obj.alignment = align
    run = p_obj.add_run()
    run.text = str(text)
    run.font.size  = Pt(size)
    run.font.bold  = bold
    run.font.color.rgb = rgb(color) if color else rgb(p["title"])

def add_accent_bar(slide, color_tuple=None, height=Inches(0.06)):
    c = color_tuple or p["accent"]
    add_rect(slide, 0, 0, W, height, c)

def add_chart_to_slide(slide, chart_data_dict, left, top, width, height):
    ctype = chart_data_dict.get("type", "bar")
    raw   = chart_data_dict.get("data", [])
    categories = [str(d.get("name","")) for d in raw]
    values     = [float(d.get("value", 0)) for d in raw]

    cd = ChartData()
    cd.categories = categories
    cd.add_series("", values)

    xl_type_map = {
        "bar":  XL_CHART_TYPE.COLUMN_CLUSTERED,
        "line": XL_CHART_TYPE.LINE,
        "pie":  XL_CHART_TYPE.PIE,
    }
    xl_type = xl_type_map.get(ctype, XL_CHART_TYPE.COLUMN_CLUSTERED)

    graphic_frame = slide.shapes.add_chart(xl_type, left, top, width, height, cd)
    chart = graphic_frame.chart

    # Style chart
    plot = chart.plots[0]

    # Color each series/point
    accent_rgb = rgb(p["accent"])
    chart_colors = p["chart"]

    if ctype == "pie":
        for idx, point in enumerate(plot.series[0].points):
            c = chart_colors[idx % len(chart_colors)]
            point.format.fill.solid()
            point.format.fill.fore_color.rgb = rgb(c)
    else:
        for series in plot.series:
            series.format.fill.solid()
            series.format.fill.fore_color.rgb = accent_rgb

    # Style chart area backgrounds and axes — wrapped in try/except
    # because attribute availability varies by python-pptx version
    try:
        chart.chart_area.format.fill.background()
    except Exception:
        pass
    try:
        chart.plot_area.format.fill.background()
    except Exception:
        pass

    # Legend
    try:
        if ctype == "pie" and chart.has_legend:
            chart.legend.position = 2  # right
            chart.legend.include_in_layout = False
    except Exception:
        pass

    # Remove gridlines visual noise
    try:
        chart.value_axis.major_gridlines.format.line.fill.background()
    except Exception:
        pass

    # Axis label colors
    try:
        ax_color = rgb(p["muted"])
        for axis in [chart.category_axis, chart.value_axis]:
            axis.tick_labels.font.size = Pt(10)
            axis.tick_labels.font.color.rgb = ax_color
            axis.format.line.fill.background()
    except Exception:
        pass

    return graphic_frame

# ── Slide renderers ────────────────────────────────────────────────────────
for s in slides_data:
    slide = prs.slides.add_slide(blank)
    set_bg(slide, p["bg"])
    layout  = s.get("layout", "content")
    title   = s.get("title", "")
    subtitle= s.get("subtitle", "")
    body    = s.get("body", "")
    bullets = s.get("bullets", [])
    notes   = s.get("notes", "")

    if notes:
        slide.notes_slide.notes_text_frame.text = notes

    if layout == "title":
        # Full-slide gradient feel via two rects
        add_rect(slide, 0, 0, W, H, p["bg"])
        add_rect(slide, 0, Inches(2.8), W, Inches(2.0), p["bg2"])
        add_accent_bar(slide, p["accent"], Inches(0.08))
        # Bottom bar
        add_rect(slide, 0, H - Inches(0.08), W, Inches(0.08), p["accent"])
        add_tb(slide, title,
               Inches(1.2), Inches(1.8), Inches(10.9), Inches(1.6),
               size=44, bold=True, align=PP_ALIGN.CENTER)
        add_tb(slide, subtitle,
               Inches(1.2), Inches(3.5), Inches(10.9), Inches(0.9),
               size=22, color=p["muted"], align=PP_ALIGN.CENTER)

    elif layout == "quote":
        add_accent_bar(slide)
        quote  = s.get("quote") or body
        author = s.get("author", "")
        # Large decorative quote mark
        add_tb(slide, "\\u201c",
               Inches(0.8), Inches(0.6), Inches(2), Inches(2),
               size=96, bold=True, color=p["accent"])
        add_tb(slide, quote,
               Inches(1.2), Inches(1.6), Inches(10.9), Inches(3.8),
               size=26, align=PP_ALIGN.LEFT, wrap=True)
        if author:
            add_tb(slide, f"\\u2014 {author}",
                   Inches(1.2), Inches(5.6), Inches(10.9), Inches(0.6),
                   size=16, color=p["muted"])

    elif layout == "two-column":
        add_accent_bar(slide)
        if title:
            add_tb(slide, title,
                   Inches(0.5), Inches(0.35), Inches(12.3), Inches(0.85),
                   size=28, bold=True)
        # Divider
        add_rect(slide, Inches(6.5), Inches(1.5), Inches(0.03), Inches(5.5), p["muted"])
        left_text  = s.get("leftContent", "")
        right_text = s.get("rightContent", "")
        left_buls  = s.get("leftBullets", [])
        right_buls = s.get("rightBullets", [])
        if left_text:
            add_tb(slide, left_text,  Inches(0.5), Inches(1.5), Inches(5.7), Inches(5.5), size=16)
        if right_text:
            add_tb(slide, right_text, Inches(6.8), Inches(1.5), Inches(5.7), Inches(5.5), size=16)
        top_l = Inches(1.5)
        for b in left_buls:
            add_tb(slide, f"\\u2022  {b}", Inches(0.5), top_l, Inches(5.7), Inches(0.6), size=16, color=p["body"])
            top_l += Inches(0.62)
        top_r = Inches(1.5)
        for b in right_buls:
            add_tb(slide, f"\\u2022  {b}", Inches(6.8), top_r, Inches(5.7), Inches(0.6), size=16, color=p["body"])
            top_r += Inches(0.62)

    elif layout == "chart":
        add_accent_bar(slide)
        if title:
            add_tb(slide, title,
                   Inches(0.5), Inches(0.35), Inches(12.3), Inches(0.85),
                   size=28, bold=True)
        chart_data_dict = s.get("chart")
        if chart_data_dict and chart_data_dict.get("data"):
            add_chart_to_slide(slide, chart_data_dict,
                               Inches(0.8), Inches(1.4),
                               Inches(11.7), Inches(5.6))
        else:
            add_tb(slide, "No chart data provided.",
                   Inches(0.5), Inches(3.0), Inches(12.3), Inches(1),
                   size=18, color=p["muted"], align=PP_ALIGN.CENTER)

    else:  # content / image / default
        add_accent_bar(slide)
        if title:
            add_tb(slide, title,
                   Inches(0.5), Inches(0.35), Inches(12.3), Inches(0.85),
                   size=28, bold=True)
        y = Inches(1.45)
        if body:
            add_tb(slide, body,
                   Inches(0.6), y, Inches(12.1), Inches(1.1),
                   size=17, color=p["body"])
            y += Inches(1.2)
        for bullet in bullets:
            add_tb(slide, f"\\u2022  {bullet}",
                   Inches(0.8), y, Inches(11.7), Inches(0.62),
                   size=17, color=p["body"])
            y += Inches(0.65)

buf = io.BytesIO()
prs.save(buf)
buf.seek(0)
print("data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64," + base64.b64encode(buf.read()).decode())
`.trim();
}
