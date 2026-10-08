from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "deliverables" / "首版认证-Logo高清印刷包"
OUTPUT_PATH = OUTPUT_DIR / "首版认证-横版Logo-文字转曲-矢量.svg"
FONT_PATH = Path(r"C:\Windows\Fonts\msyhbd.ttc")

TEXT = "首版认证"
FONT_SIZE = 48
LETTER_SPACING = 4
BASELINE_X = 128
BASELINE_Y = 69


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

        x = float(BASELINE_X)
        glyph_paths: list[str] = []

        for character in TEXT:
            glyph_name = cmap.get(ord(character))
            if glyph_name is None:
                raise ValueError(f"Font is missing glyph for {character!r}")

            pen = SVGPathPen(glyph_set)
            glyph_set[glyph_name].draw(pen)
            path_data = pen.getCommands()
            glyph_paths.append(
                "    <path "
                f'd="{path_data}" '
                f'transform="translate({x:.6f} {BASELINE_Y}) '
                f'scale({scale:.10f} {-scale:.10f})" />'
            )

            advance_width = horizontal_metrics[glyph_name][0]
            x += advance_width * scale + LETTER_SPACING

        svg = "\n".join(
            [
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 376 104" role="img" aria-labelledby="shouban-print-logo-title">',
                '  <title id="shouban-print-logo-title">首版认证</title>',
                '  <g aria-hidden="true">',
                '    <rect x="4" y="0" width="30" height="104" rx="15" fill="#0B132B" />',
                '    <rect x="46" y="0" width="54" height="32" rx="14" fill="#3347B8" />',
                '    <path fill="#0B132B" d="M72 44H96A4 4 0 0 1 100 48V52A4 4 0 0 1 96 56H90C80 56 72 64 72 74C72 84 80 92 90 92H96A4 4 0 0 1 100 96V100A4 4 0 0 1 96 104H72C55 104 42 91 42 74C42 57 55 44 72 44Z" />',
                '  </g>',
                '  <g fill="#0B132B" aria-hidden="true">',
                *glyph_paths,
                '  </g>',
                '</svg>',
                '',
            ]
        )
        OUTPUT_PATH.write_text(svg, encoding="utf-8")

        print(
            f"Created {OUTPUT_PATH} with {len(glyph_paths)} outlined glyphs; "
            f"wordmark ends at x={x - LETTER_SPACING:.2f}."
        )
    finally:
        font.close()


if __name__ == "__main__":
    main()
