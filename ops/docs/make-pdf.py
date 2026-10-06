#!/usr/bin/env python3
"""Render the publication's documents to print-ready PDFs.

Markdown in docs/ is the single source of truth; every PDF here is a rendering of it, never a
second copy that can drift. One command rebuilds the lot:

    python3 ops/docs/make-pdf.py

Pipeline, and why each step exists:

  1. pandoc (gfm)       markdown -> HTML, so tables and task lists survive
  2. chrome --headless  HTML -> PDF, in the publication's own typefaces (Crimson Pro for
                        headings, Inter for body) embedded as base64, so no network is needed
  3. pdflatex           stamps a running footer -- label left, page number right

Step 3 is not decoration. Chrome's command line can switch its built-in header/footer on or
off but cannot set a footer TEMPLATE, and its default prints the source file path, which is
unacceptable on a document going to a priest. Setting a custom template needs CDP, which needs
a websocket client this machine does not have. pdfpages + eso-pic stamps the footer instead,
using only the TeX already installed.
"""

from __future__ import annotations

import base64
import pathlib
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parents[2]
DOCS = REPO / "docs"
OUT = DOCS / "pdf"
BUILD = OUT / ".build"
FONT_ROOT = REPO / "site" / "node_modules" / "@fontsource-variable"

# (family, file, weight, style)
FACES = [
    ("Crimson Pro", "crimson-pro/files/crimson-pro-latin-wght-normal.woff2", "200 900", "normal"),
    ("Crimson Pro", "crimson-pro/files/crimson-pro-latin-ext-wght-normal.woff2", "200 900", "normal"),
    ("Crimson Pro", "crimson-pro/files/crimson-pro-latin-wght-italic.woff2", "200 900", "italic"),
    ("Crimson Pro", "crimson-pro/files/crimson-pro-latin-ext-wght-italic.woff2", "200 900", "italic"),
    ("Inter", "inter/files/inter-latin-wght-normal.woff2", "100 900", "normal"),
    ("Inter", "inter/files/inter-latin-ext-wght-normal.woff2", "100 900", "normal"),
    ("Inter", "inter/files/inter-latin-wght-italic.woff2", "100 900", "italic"),
    ("Inter", "inter/files/inter-latin-ext-wght-italic.woff2", "100 900", "italic"),
]

# markdown file -> (output stem, kicker line under the masthead)
DOCUMENTS = {
    "spanish-edition-brief.md": ("spanish-edition-brief", "A brief for a writer"),
    "translation-standard.md": ("translation-standard", "The Spanish translation standard"),
    "glossary.es.md": ("glossary-es", "Locked terminology, English--Spanish"),
}

# The running footer per document. ASCII only, with LaTeX dashes (`---` = em dash): pdflatex's
# text fonts carry no arrow glyph, so an arrow in the label would fail the build.
FOOTERS = {
    "spanish-edition-brief": "Magnifica Humanitas --- a brief for a writer",
    "translation-standard": "Magnifica Humanitas --- Spanish translation standard",
    "glossary-es": "Magnifica Humanitas --- locked glossary, English to Spanish",
}


def font_css() -> str:
    out = []
    for family, rel, weight, style in FACES:
        path = FONT_ROOT / rel
        if not path.exists():
            sys.exit(f"missing font file: {path}")
        b64 = base64.b64encode(path.read_bytes()).decode()
        out.append(
            "@font-face{"
            f"font-family:'{family}';font-style:{style};font-weight:{weight};font-display:block;"
            f"src:url(data:font/woff2;base64,{b64}) format('woff2-variations');"
            "}"
        )
    return "\n".join(out)


CSS = r"""
:root{
  --ink:#252525; --mist:#CFCFCF; --slate:#7D7D7D; --meta:#545454;
  --canvas:#FFFFFF; --vatican:#FFE100; --tint:#F4F4F4;
}
@page{ size:A4; margin:16mm 15mm 17mm 15mm; }
*{ box-sizing:border-box; }
html{ font-size:10.2pt; }
body{
  font-family:'Inter','DejaVu Sans',system-ui,sans-serif;
  color:var(--ink); background:var(--canvas);
  line-height:1.45; margin:0; font-weight:380;
  -webkit-font-smoothing:antialiased;
  hanging-punctuation:first;
}
/* Identity: the publication's 3px vatican band, exactly as it sits above the site header. */
.band{ height:3px; background:var(--vatican); margin-bottom:14px; }
.masthead{ margin-bottom:22px; }
.wordmark{
  font-family:'Crimson Pro',Georgia,serif; font-size:13pt; font-weight:600;
  letter-spacing:.02em; color:var(--ink);
}
.kicker{
  font-size:7.6pt; text-transform:uppercase; letter-spacing:.13em;
  color:var(--meta); margin-top:3px;
}
h1,h2,h3,h4{ font-family:'Crimson Pro',Georgia,serif; font-weight:600; color:var(--ink);
  line-height:1.2; margin:0; text-wrap:balance; }
h1{ font-size:23pt; margin:0 0 6px; letter-spacing:-.005em; }
h2{
  font-size:13.5pt; margin:17px 0 6px; padding-top:8px;
  border-top:1px solid var(--slate); break-after:avoid; page-break-after:avoid;
}
h3{ font-size:11.5pt; margin:13px 0 5px; break-after:avoid; page-break-after:avoid; }
h4{ font-size:10.5pt; margin:11px 0 4px; break-after:avoid; }
p{ margin:0 0 7px; orphans:2; widows:2; }
strong{ font-weight:620; }
em{ font-style:italic; }
a{ color:var(--ink); text-decoration:underline; text-decoration-color:var(--slate);
  text-underline-offset:2px; word-break:break-word; }
hr{ border:0; border-top:1px solid var(--slate); margin:18px 0; }
ul,ol{ margin:0 0 9px; padding-left:19px; }
li{ margin:0 0 3.5px; }
li::marker{ color:var(--meta); }
/* Quotation: the site's mist panel with a slate spine. */
blockquote{
  margin:11px 0; padding:9px 13px; background:var(--tint);
  border-left:2px solid var(--slate); break-inside:avoid; page-break-inside:avoid;
}
blockquote p{ margin:0; font-family:'Crimson Pro',Georgia,serif; font-size:11pt; line-height:1.42; }
blockquote p+p{ margin-top:6px; }
/* The standard and glossary are tables of record — they must survive a page break. */
table{ width:100%; border-collapse:collapse; margin:8px 0 12px; font-size:9pt; }
thead{ display:table-header-group; }
tr{ break-inside:avoid; page-break-inside:avoid; }
th{
  text-align:left; font-weight:620; font-size:7.8pt; text-transform:uppercase;
  letter-spacing:.075em; color:var(--meta); background:var(--tint);
  border-bottom:1px solid var(--slate); padding:5px 8px; vertical-align:bottom;
}
td{ padding:5px 8px; border-bottom:1px solid #E6E6E6; vertical-align:top; }
td:first-child,th:first-child{ padding-left:0; }
td:last-child,th:last-child{ padding-right:0; }
/* Review checklists render as real boxes so they can be ticked on paper. */
input[type=checkbox]{ appearance:none; width:8.5px; height:8.5px; margin:0 7px 0 0;
  border:1px solid var(--slate); border-radius:1.5px; vertical-align:1px;
  display:inline-block; flex:0 0 auto; }
ul.task-list{ list-style:none; padding-left:0; }
ul.task-list li{ display:flex; align-items:flex-start; }
code{
  font-family:'DejaVu Sans Mono',ui-monospace,monospace; font-size:9pt;
  background:var(--tint); padding:1px 3px; border-radius:2px;
}
/* Localised addresses and Latin titles read as themselves. */
[lang=es], .es{ font-style:normal; }
"""

TEMPLATE = """<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>
{font_css}
{css}
</style>
</head>
<body>
<div class="band"></div>
<header class="masthead">
  <div class="wordmark">Magnifica Humanitas</div>
  <div class="kicker">{kicker}</div>
</header>
<main>
{fragment}
</main>
</body>
</html>
"""

# Zero-margin geometry so the included A4 page lands 1:1, and the footer is placed inside the
# blank strip the source already reserves below the text (16mm top / 17mm bottom), so it
# cannot collide with content. 15mm = 42.5pt; 552.8pt = 195mm, i.e. A4's 595.28pt less two
# 15mm margins. y=27pt sits ~9.5mm up from the paper edge.
STAMP_TEMPLATE = r"""\documentclass[a4paper]{article}
\usepackage[margin=0pt,paperwidth=210mm,paperheight=297mm]{geometry}
\usepackage{pdfpages}
\usepackage{eso-pic}
\usepackage{xcolor}
\usepackage[T1]{fontenc}
\definecolor{metagrey}{HTML}{545454}
\pagestyle{empty}
\begin{document}
\AddToShipoutPictureFG{%
  \AtPageLowerLeft{%
    \put(42.5,27){\makebox(0,0)[l]{\sffamily\fontsize{7}{8}\selectfont\color{metagrey}@@LABEL@@}}%
    \put(552.8,27){\makebox(0,0)[r]{\sffamily\fontsize{7}{8}\selectfont\color{metagrey}\thepage\,/\,@@TOTAL@@}}%
  }%
}
\includepdf[pages=-]{@@INPUT@@}
\end{document}
"""


def md_to_html(md_name: str, stem: str, kicker: str, fcss: str) -> pathlib.Path:
    src = DOCS / md_name
    if not src.exists():
        sys.exit(f"missing source: {src}")

    # GFM so tables and task lists survive; --wrap=none keeps addresses on one line.
    frag = subprocess.run(
        ["pandoc", "-f", "gfm", "-t", "html", "--wrap=none", str(src)],
        capture_output=True, text=True, check=True,
    ).stdout

    title = src.stem
    for line in src.read_text().splitlines():
        if line.startswith("# "):
            title = line[2:].strip()
            break

    html = TEMPLATE.format(
        lang="es" if md_name.endswith(".es.md") else "en",
        title=title.replace("&", "&amp;").replace("<", "&lt;"),
        font_css=fcss, css=CSS, kicker=kicker, fragment=frag,
    )
    out_html = BUILD / f"{stem}.html"
    out_html.write_text(html)
    return out_html


def html_to_pdf(html_path: pathlib.Path, pdf_path: pathlib.Path) -> None:
    # CSS @page sets A4 and the margins; Chrome honours it. --no-pdf-header-footer is required
    # here because Chrome's default footer would print the source file path.
    subprocess.run(
        [
            "google-chrome", "--headless=new", "--disable-gpu", "--no-sandbox",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_path}", f"file://{html_path}",
        ],
        capture_output=True, check=True,
    )
    if not pdf_path.exists():
        sys.exit(f"chrome produced no PDF for {html_path.name}")


def _pages(pdf: pathlib.Path) -> str:
    info = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True).stdout
    n = next((l.split()[1] for l in info.splitlines() if l.startswith("Pages:")), None)
    if n is None:
        sys.exit(f"could not read the page count of {pdf}")
    return n


def stamp_footer(raw_pdf: pathlib.Path, out_pdf: pathlib.Path, label: str) -> str:
    """Add the running footer with pdfpages + eso-pic. Two passes, because the total page
    count in the footer needs the .aux the first pass writes."""
    pages = _pages(raw_pdf)

    tex = BUILD / f"{out_pdf.stem}.tex"
    # Token replacement, not %-formatting: the template is LaTeX, and LaTeX uses a trailing
    # `%` as a comment character, which %-formatting reads as the start of a format spec.
    tex.write_text(
        STAMP_TEMPLATE
        .replace("@@LABEL@@", label)
        .replace("@@TOTAL@@", pages)
        .replace("@@INPUT@@", raw_pdf.name)
    )

    for _ in range(2):
        res = subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", "-halt-on-error",
             f"-output-directory={BUILD}", tex.name],
            cwd=BUILD, capture_output=True, text=True,
        )
        if res.returncode != 0:
            log = BUILD / f"{out_pdf.stem}.log"
            tail = "\n".join(log.read_text().splitlines()[-25:]) if log.exists() else res.stdout[-2000:]
            sys.exit(f"pdflatex failed for {out_pdf.name}:\n{tail}")

    out_pdf.write_bytes((BUILD / f"{out_pdf.stem}.pdf").read_bytes())

    # A stamp that reflows the document or spills a blank page is a defect, and pdfpages can
    # do both. Assert the page count survived the stamp rather than trusting it.
    after = _pages(out_pdf)
    if after != pages:
        sys.exit(f"{out_pdf.name}: page count changed {pages} -> {after} while stamping")
    return pages


def main() -> int:
    if subprocess.run(["which", "pdflatex"], capture_output=True).returncode != 0:
        sys.exit("pdflatex not found -- needed to stamp the page-number footer")
    OUT.mkdir(parents=True, exist_ok=True)
    BUILD.mkdir(parents=True, exist_ok=True)
    fcss = font_css()

    for md_name, (stem, kicker) in DOCUMENTS.items():
        html = md_to_html(md_name, stem, kicker, fcss)
        raw = BUILD / f"{stem}.raw.pdf"
        html_to_pdf(html, raw)
        n = stamp_footer(raw, OUT / f"{stem}.pdf", FOOTERS[stem])
        print(f"  {stem}.pdf  {n} pages")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
