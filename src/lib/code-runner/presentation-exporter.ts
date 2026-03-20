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
import copy, json, base64, io, urllib.request

data = json.loads(${escaped})
slides_data = data.get("slides", [])
theme = data.get("theme", "corporate")

# ── Theme palettes ─────────────────────────────────────────────────────────
PALETTES = {
  "dark": {
    "slide": (0x02,0x06,0x17),      # bg-gray-950
    "header": (0x03,0x07,0x12),     # bg-gray-900
    "titleSlide": (0x02,0x06,0x17), 
    "titleText": (0xff,0xff,0xff),
    "body": (0xd1,0xd5,0xdb),       # text-gray-300
    "accent": (0x3b,0x82,0xf6),     # blue-500
    "cardBg": (0x03,0x07,0x12),     # bg-gray-900
    "cardBorder": (0x1f,0x29,0x37), # border-gray-800
    "chart": [(0x3b,0x82,0xf6), (0x10,0xb9,0x81), (0xf5,0x9e,0x0b), (0xef,0x44,0x44), (0x8b,0x5c,0xf6)],
    "muted": (0x94,0xa3,0xb8)
  },
  "light": {
    "slide": (0xf8,0xfa,0xfc),      # bg-slate-50
    "header": (0x25,0x63,0xeb),     # bg-blue-600
    "titleSlide": (0x25,0x63,0xeb), 
    "titleText": (0xff,0xff,0xff),
    "body": (0x47,0x55,0x69),       # text-slate-600
    "accent": (0x25,0x63,0xeb),     # blue-600
    "cardBg": (0xff,0xff,0xff),     # bg-white
    "cardBorder": (0xf1,0xf5,0xf9), # border-slate-100
    "chart": [(0x25,0x63,0xeb), (0x16,0xa3,0x4a), (0xd9,0x77,0x06), (0xdc,0x26,0x26), (0x7c,0x3a,0xed)],
    "muted": (0x64,0x74,0x8b)
  },
  "corporate": {
    "slide": (0xf4,0xf7,0xf9),      # #F4F7F9
    "header": (0x00,0x5b,0x73),     # #005B73
    "titleSlide": (0x00,0x5b,0x73),
    "titleText": (0xff,0xff,0xff),
    "body": (0x33,0x41,0x55),       # slate-700
    "accent": (0x00,0x8c,0x99),     # #008C99
    "cardBg": (0xff,0xff,0xff),     # white
    "cardBorder": (0x00,0x5b,0x73),
    "chart": [(0x00,0x5b,0x73), (0x00,0x8c,0x99), (0x4cb1,0xc4), (0xf2,0x69,0x22), (0xe8,0x4e,0x36)],
    "muted": (0x64,0x74,0x8b)
  },
  "minimal": {
    "slide": (0xfd,0xfb,0xf7),      # #FDFBF7
    "header": (0xe8,0x4e,0x36),     # #E84E36
    "titleSlide": (0xe8,0x4e,0x36),
    "titleText": (0xff,0xff,0xff),
    "body": (0x4a,0x4a,0x4a),       # #4A4A4A
    "accent": (0xe8,0x4e,0x36),     # #E84E36
    "cardBg": (0xff,0xff,0xff),     # white
    "cardBorder": (0xe8,0x4e,0x36),
    "chart": [(0xe8,0x4e,0x36), (0x2c,0x2c,0x2c), (0xf4,0xa2,0x61), (0xe7,0x6f,0x51), (0x2a,0x9d,0x8f)],
    "muted": (0x64,0x74,0x8b)
  }
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

def add_rect(slide, left, top, width, height, color_tuple, border_color=None, border_width=Pt(1)):
    shape = slide.shapes.add_shape(1, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb(color_tuple)
    if border_color:
        shape.line.color.rgb = rgb(border_color)
        shape.line.width = border_width
    else:
        shape.line.fill.background()
    return shape

def add_tb(slide, text, left, top, width, height,
           size=18, bold=False, color=None, align=PP_ALIGN.LEFT, wrap=True, font_family="Helvetica"):
    if not text:
        return
    txb = slide.shapes.add_textbox(left, top, width, height)
    tf  = txb.text_frame
    tf.word_wrap = wrap
    try:
        p_obj = tf.paragraphs[0]
    except:
        p_obj = tf.add_paragraph()
    p_obj.alignment = align
    run = p_obj.add_run()
    run.text = str(text)
    run.font.name = font_family
    run.font.size  = Pt(size)
    run.font.bold  = bold
    run.font.color.rgb = rgb(color) if color else rgb(p["titleText"])

def add_image(slide, url, left, top, width, height):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            image_data = response.read()
            image_stream = io.BytesIO(image_data)
            slide.shapes.add_picture(image_stream, left, top, width=width, height=height)
    except Exception as e:
        print(f"Error loading image: {e}")
        add_rect(slide, left, top, width, height, p["cardBg"], border_color=p["cardBorder"])
        add_tb(slide, "Click to open image", left + Inches(0.5), top + height/2, width - Inches(1.0), Inches(0.5), size=12, color=p["muted"])

def add_chart_to_slide(slide, chart_data_dict, left, top, width, height):
    try:
        ctype = chart_data_dict.get("type", "bar")
        raw   = chart_data_dict.get("data", [])
        if not raw: return
        
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
        plot = chart.plots[0]

        chart_colors = p["chart"]
        if ctype == "pie":
            for idx, point in enumerate(plot.series[0].points):
                c = chart_colors[idx % len(chart_colors)]
                point.format.fill.solid()
                point.format.fill.fore_color.rgb = rgb(c)
        else:
            for series in plot.series:
                series.format.fill.solid()
                series.format.fill.fore_color.rgb = rgb(chart_colors[0])

        try:
            chart.has_legend = (ctype == "pie")
            if chart.has_legend:
                chart.legend.position = 2  # right
        except: pass

        try:
            ax_color = rgb(p["muted"])
            for axis in [chart.category_axis, chart.value_axis]:
                axis.tick_labels.font.size = Pt(10)
                axis.tick_labels.font.color.rgb = ax_color
        except: pass

        return graphic_frame
    except Exception as e:
        print(f"Chart error: {e}")
        return None

# ── Main Render Loop ───────────────────────────────────────────────────────
for s in slides_data:
    try:
        slide = prs.slides.add_slide(blank)
        set_bg(slide, p["slide"])
        layout  = s.get("layout", "content")
        title   = s.get("title", "")
        subtitle= s.get("subtitle", "")
        body    = s.get("body", "")
        bullets = s.get("bullets", [])
        
        if layout == "title":
            add_rect(slide, 0, 0, W, H, p["titleSlide"])
            add_tb(slide, title, Inches(1.5), Inches(2.2), Inches(10.33), Inches(2.0), size=56, bold=True, align=PP_ALIGN.CENTER)
            if subtitle:
                add_tb(slide, subtitle, Inches(1.5), Inches(4.2), Inches(10.33), Inches(1.0), size=28, color=p["titleText"], align=PP_ALIGN.CENTER)

        elif layout == "quote":
            m = Inches(1.0)
            add_rect(slide, m, m, W - 2*m, H - 2*m, p["cardBg"], border_color=p["cardBorder"], border_width=Pt(2))
            quote = s.get("quote") or body
            author = s.get("author", "")
            add_tb(slide, "\\u201C", m + Inches(0.5), m + Inches(0.5), Inches(1), Inches(1), size=80, color=p["accent"], bold=True)
            add_tb(slide, quote, m + Inches(1.0), m + Inches(1.5), W - 2*m - Inches(2.0), Inches(2.5), size=34, color=p["body"], align=PP_ALIGN.CENTER)
            if author:
                add_tb(slide, f"\\u2014 {author}", m + Inches(1.0), m + Inches(4.0), W - 2*m - Inches(2.0), Inches(0.6), size=22, color=p["accent"], bold=True, align=PP_ALIGN.CENTER)

        elif layout == "image":
            header_h = Inches(1.0)
            add_rect(slide, 0, 0, W, header_h, p["header"])
            add_tb(slide, title, Inches(0.8), Inches(0.2), W - Inches(1.6), header_h, size=34, bold=True)
            m = Inches(0.8)
            add_rect(slide, m, header_h + m, W - 2*m, H - header_h - 2*m, p["cardBg"], border_color=p["cardBorder"], border_width=Pt(2))
            img_url = s.get("imageUrl") or s.get("url")
            if img_url:
                add_image(slide, img_url, m + Inches(0.4), header_h + m + Inches(0.4), W - 2*m - Inches(0.8), H - header_h - 2*m - Inches(0.8))

        elif layout == "two-column":
            header_h = Inches(1.0)
            add_rect(slide, 0, 0, W, header_h, p["header"])
            add_tb(slide, title, Inches(0.8), Inches(0.2), W - Inches(1.6), header_h, size=34, bold=True)
            card_w = (W - Inches(2.4)) / 2
            card_h = H - header_h - Inches(1.6)
            add_rect(slide, Inches(0.8), header_h + Inches(0.8), card_w, card_h, p["cardBg"], border_color=p["cardBorder"], border_width=Pt(2))
            add_rect(slide, Inches(0.8) + card_w + Inches(0.8), header_h + Inches(0.8), card_w, card_h, p["cardBg"], border_color=p["cardBorder"], border_width=Pt(2))
            
            # Left content
            ly = header_h + Inches(1.3)
            lbody = s.get("leftContent", "")
            if lbody: 
                add_tb(slide, lbody, Inches(1.3), ly, card_w - Inches(1.0), Inches(1.2), size=19, color=p["body"])
                ly += Inches(1.2)
            left_bullets = s.get("leftBullets", [])
            for b in left_bullets:
                add_tb(slide, f"\\u2022 {b}", Inches(1.5), ly, card_w - Inches(1.4), Inches(0.6), size=19, color=p["body"])
                ly += Inches(0.55)
            
            # Right content
            ry = header_h + Inches(1.3)
            rbody = s.get("rightContent", "")
            if rbody: 
                add_tb(slide, rbody, Inches(0.8) + card_w + Inches(1.3), ry, card_w - Inches(1.0), Inches(1.2), size=19, color=p["body"])
                ry += Inches(1.2)
            right_bullets = s.get("rightBullets", [])
            for b in right_bullets:
                add_tb(slide, f"\\u2022 {b}", Inches(0.8) + card_w + Inches(1.5), ry, card_w - Inches(1.4), Inches(0.6), size=19, color=p["body"])
                ry += Inches(0.55)

        elif layout == "chart":
            header_h = Inches(1.0)
            add_rect(slide, 0, 0, W, header_h, p["header"])
            add_tb(slide, title, Inches(0.8), Inches(0.2), W - Inches(1.6), header_h, size=34, bold=True)
            m = Inches(0.8)
            add_rect(slide, m, header_h + m, W - 2*m, H - header_h - 2*m, p["cardBg"], border_color=p["cardBorder"], border_width=Pt(2))
            chart_data = s.get("chart")
            if chart_data:
                add_chart_to_slide(slide, chart_data, m + Inches(0.8), header_h + m + Inches(0.8), W - 2*m - Inches(1.6), H - header_h - 2*m - Inches(1.6))

        else: # content / default
            header_h = Inches(1.0)
            add_rect(slide, 0, 0, W, header_h, p["header"])
            add_tb(slide, title, Inches(0.8), Inches(0.2), W - Inches(1.6), header_h, size=34, bold=True)
            m = Inches(0.8)
            add_rect(slide, m, header_h + m, W - 2*m, H - header_h - 2*m, p["cardBg"], border_color=p["cardBorder"], border_width=Pt(2))
            y = header_h + m + Inches(0.8)
            if body:
                add_tb(slide, body, m + Inches(0.8), y, W - 2*m - Inches(1.6), Inches(1.2), size=22, color=p["body"])
                y += Inches(1.5)
            for b in bullets:
                add_tb(slide, f"\\u2022 {b}", m + Inches(1.1), y, W - 2*m - Inches(2.2), Inches(0.6), size=22, color=p["body"])
                y += Inches(0.6)
    except Exception as e:
        print(f"Slide error: {e}")

buf = io.BytesIO()
prs.save(buf)
buf.seek(0)
# Use print() so artifact-panel.tsx can find it in stdout logs
print("data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64," + base64.b64encode(buf.read()).decode())
`.trim();
}
