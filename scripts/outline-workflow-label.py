from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "deliverables" / "宣传流程图高清印刷包-v2-小字增强"
OUTPUT_PATH = OUTPUT_DIR / "宣传流程图-管理难文字层-矢量.svg"
FONT_PATH = Path(r"C:\Windows\Fonts\msyhbd.ttc")

TEXT = "管理难"
FONT_SIZE = 16
LETTER_SPACING = 1
BASELINE_X = 174.5
BASELINE_Y = 205
FILL = "#8B6754"


def main() -> None:
    if not FONT_PATH.exists():
        raise FileNotFoundError(f"Required outline font not found: {FONT_PATH}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    font = TTFont(str(FONT_PATH), fontNumber=0)
    try:
        glyph_set = font.getGlyphSet()
        cmap = font.getBestCmap()
        horizontal_metrics = font["hmtx"].metrics
        units_per_em = font["head"].unitsPerEm
        scale = FONT_SIZE / units_per_em

        x = BASELINE_X
        paths: list[str] = []

        for character in TEXT:
            glyph_name = cmap.get(ord(character))
            if glyph_name is None:
                raise ValueError(f"Font is missing glyph for {character!r}")

            pen = SVGPathPen(glyph_set)
            glyph_set[glyph_name].draw(pen)
            paths.append(
                "    <path "
                f'd="{pen.getCommands()}" '
                f'transform="translate({x:.6f} {BASELINE_Y}) '
                f'scale({scale:.10f} {-scale:.10f})" />'
            )
            x += horizontal_metrics[glyph_name][0] * scale + LETTER_SPACING

        svg = "\n".join(
            [
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1387 580">',
                f'  <g fill="{FILL}" aria-label="{TEXT}">',
                *paths,
                "  </g>",
                "</svg>",
                "",
            ]
        )
        OUTPUT_PATH.write_text(svg, encoding="utf-8")
        print(
            f"Created {OUTPUT_PATH} with {len(paths)} outlined glyphs; "
            f"label ends at x={x - LETTER_SPACING:.2f}."
        )
    finally:
        font.close()


if __name__ == "__main__":
    main()
