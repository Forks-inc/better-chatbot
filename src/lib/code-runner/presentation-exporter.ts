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
import json, base64, io

data = json.loads(${escaped})
slides_data = data.get("slides", [])
theme = data.get("theme", "dark")

prs = Presentation()
prs.slide_width  = Inches(13.33)
prs.slide_height = Inches(7.5)

# Theme accent colors
ACCENT = {
  "dark": RGBColor(0x60, 0xa5, 0xfa),
  "light": RGBColor(0x25, 0x63, 0xeb),
  "corporate": RGBColor(0x22, 0xd3, 0xee),
  "minimal": RGBColor(0x29, 0x25, 0x24),
}.get(theme, RGBColor(0x60, 0xa5, 0xfa))

BG_COLOR = {
  "dark": RGBColor(0x11, 0x18, 0x27),
  "light": RGBColor(0xff, 0xff, 0xff),
  "corporate": RGBColor(0x1e, 0x29, 0x3b),
  "minimal": RGBColor(0xf5, 0xf5, 0xf4),
}.get(theme, RGBColor(0x11, 0x18, 0x27))

TEXT_COLOR = {
  "dark": RGBColor(0xff, 0xff, 0xff),
  "light": RGBColor(0x11, 0x18, 0x27),
  "corporate": RGBColor(0xff, 0xff, 0xff),
  "minimal": RGBColor(0x1c, 0x19, 0x17),
}.get(theme, RGBColor(0xff, 0xff, 0xff))

blank_layout = prs.slide_layouts[6]  # blank layout

def add_bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_text_box(slide, text, left, top, width, height,
                 font_size=18, bold=False, color=None, align=PP_ALIGN.LEFT):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.color.rgb = color or TEXT_COLOR

W = prs.slide_width
H = prs.slide_height

for s in slides_data:
    slide = prs.slides.add_slide(blank_layout)
    add_bg(slide, BG_COLOR)
    layout = s.get("layout", "content")
    title = s.get("title", "")
    subtitle = s.get("subtitle", "")
    body = s.get("body", "")
    bullets = s.get("bullets", [])

    if layout == "title":
        add_text_box(slide, title,
                     Inches(1), Inches(2.5), Inches(11.33), Inches(1.5),
                     font_size=40, bold=True, align=PP_ALIGN.CENTER)
        if subtitle:
            add_text_box(slide, subtitle,
                         Inches(1), Inches(4.2), Inches(11.33), Inches(0.8),
                         font_size=22, color=RGBColor(0x9c, 0xa3, 0xaf),
                         align=PP_ALIGN.CENTER)

    elif layout == "quote":
        quote = s.get("quote") or body
        author = s.get("author", "")
        add_text_box(slide, f'\\u201c{quote}\\u201d',
                     Inches(1.5), Inches(1.5), Inches(10.33), Inches(3.5),
                     font_size=24, align=PP_ALIGN.CENTER)
        if author:
            add_text_box(slide, f"\\u2014 {author}",
                         Inches(1.5), Inches(5.2), Inches(10.33), Inches(0.6),
                         font_size=16, color=RGBColor(0x9c, 0xa3, 0xaf),
                         align=PP_ALIGN.CENTER)

    elif layout == "two-column":
        if title:
            add_text_box(slide, title,
                         Inches(0.5), Inches(0.3), Inches(12.33), Inches(0.8),
                         font_size=26, bold=True)
        left_content = s.get("leftContent", "") or "\\n".join(s.get("leftBullets", []))
        right_content = s.get("rightContent", "") or "\\n".join(s.get("rightBullets", []))
        add_text_box(slide, left_content,
                     Inches(0.5), Inches(1.4), Inches(5.8), Inches(5.5), font_size=16)
        add_text_box(slide, right_content,
                     Inches(7.0), Inches(1.4), Inches(5.8), Inches(5.5), font_size=16)

    else:  # content / chart / image / default
        if title:
            add_text_box(slide, title,
                         Inches(0.5), Inches(0.3), Inches(12.33), Inches(0.9),
                         font_size=28, bold=True)
        if body:
            add_text_box(slide, body,
                         Inches(0.5), Inches(1.4), Inches(12.33), Inches(1.2),
                         font_size=16)
        top = Inches(2.8) if body else Inches(1.4)
        for i, bullet in enumerate(bullets):
            add_text_box(slide, f"\\u2022  {bullet}",
                         Inches(0.8), top + Emu(i * Inches(0.55)),
                         Inches(11.5), Inches(0.55), font_size=16)

buf = io.BytesIO()
prs.save(buf)
buf.seek(0)
print("data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64," + base64.b64encode(buf.read()).decode())
`.trim();
}
