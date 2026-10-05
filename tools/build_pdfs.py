#!/usr/bin/env python3
"""Build every standards PDF from its markdown source.

The markdown is the source of truth. Run this after editing any standard;
CI fails the build if a committed PDF is out of date.
"""
import subprocess, io, os, glob, sys
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS = open(os.path.join(ROOT, "tools", "style.css")).read()
TMPL = ('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
        "<style>%s</style></head><body>%s</body></html>")

# stack directory -> (output pdf name, footer text)
TARGETS = {
    "angular":        ("Angular-Coding-Standard-v2.0.pdf",        "Angular Coding Standard v2.0"),
    "react-nextjs":   ("React-NextJS-Coding-Standard-v2.0.pdf",   "React / Next.js Coding Standard v2.0"),
    "nodejs":         ("NodeJS-Coding-Standard-v2.0.pdf",         "Node.js Coding Standard v2.0"),
    "python":         ("Python-Coding-Standard-v2.0.pdf",         "Python Coding Standard v2.0"),
    "springboot":     ("SpringBoot-Coding-Standard-v2.0.pdf",     "Spring Boot Coding Standard v2.0"),
    "mobile-flutter": ("Mobile-Flutter-Coding-Standard-v2.0.pdf", "Mobile (Flutter) Coding Standard v2.0"),
    "solidity":       ("Solidity-Engineering-Standard-v2.0.pdf",  "Solidity Engineering Standard v2.0"),
}


def build(md_path, out_path, footer):
    frag = subprocess.run(
        ["pandoc", md_path, "-f", "markdown+raw_html", "-t", "html5"],
        capture_output=True, text=True, check=True).stdout
    base = os.path.basename(out_path).replace(".pdf", "")
    html = f"/tmp/{base}.html"
    with open(html, "w", encoding="utf-8") as f:
        f.write(TMPL % (CSS, frag))
    raw = f"/tmp/{base}_raw.pdf"
    subprocess.run([
        "wkhtmltopdf", "--enable-local-file-access", "--page-size", "A4",
        "--margin-top", "18mm", "--margin-bottom", "20mm",
        "--margin-left", "16mm", "--margin-right", "16mm",
        "--encoding", "utf-8", "--quiet", html, raw], check=True)

    reader, writer = PdfReader(raw), PdfWriter()
    total = len(reader.pages)
    for i, page in enumerate(reader.pages):
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        y = 11 * mm
        c.setStrokeColorRGB(.80, .84, .86); c.setLineWidth(.4)
        c.line(16 * mm, y + 4 * mm, A4[0] - 16 * mm, y + 4 * mm)
        c.setFont("Helvetica", 7.5); c.setFillColorRGB(.42, .45, .47)
        c.drawString(16 * mm, y, footer)
        c.drawRightString(A4[0] - 16 * mm, y, f"Page {i + 1} of {total}")
        c.save(); buf.seek(0)
        page.merge_page(PdfReader(buf).pages[0])
        writer.add_page(page)
    writer.add_metadata({"/Title": footer})
    with open(out_path, "wb") as f:
        writer.write(f)
    print("built", os.path.relpath(out_path, ROOT))


def main():
    for stack, (pdf_name, footer) in TARGETS.items():
        d = os.path.join(ROOT, "standards", stack)
        sources = [p for p in glob.glob(os.path.join(d, "*.md"))]
        if len(sources) != 1:
            sys.exit(f"expected exactly one markdown source in {d}, found {len(sources)}")
        build(sources[0], os.path.join(d, pdf_name), footer)


if __name__ == "__main__":
    main()
