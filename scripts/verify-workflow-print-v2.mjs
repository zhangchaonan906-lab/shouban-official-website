import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v1 = path.join(
  root,
  "deliverables",
  "宣传流程图高清印刷包",
  "宣传流程图-原图保真-透明底-11096x4640-300dpi.png"
);
const directory = path.join(
  root,
  "deliverables",
  "宣传流程图高清印刷包-v2-小字增强"
);
const png = path.join(
  directory,
  "宣传流程图-小字增强-透明底-11096x4640-300dpi.png"
);
const jpg = path.join(
  directory,
  "宣传流程图-小字增强-黑底-11096x4640-300dpi.jpg"
);
const svg = path.join(directory, "宣传流程图-管理难文字层-矢量.svg");
const manifestPath = path.join(directory, "manifest.json");

const allowed = { x0: 1352, y0: 1472, x1: 1855, y1: 1687 };
const width = 11096;
const height = 4640;
const channels = 4;
const rowBytes = width * channels;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

const [v1Decoded, v2Decoded, pngMeta, jpgMeta, pngStats, svgText, manifestText] =
  await Promise.all([
    sharp(v1, { limitInputPixels: false })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }),
    sharp(png, { limitInputPixels: false })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }),
    sharp(png, { limitInputPixels: false }).metadata(),
    sharp(jpg, { limitInputPixels: false }).metadata(),
    sharp(png, { limitInputPixels: false }).stats(),
    readFile(svg, "utf8"),
    readFile(manifestPath, "utf8")
  ]);

assert(
  v1Decoded.info.width === width &&
    v1Decoded.info.height === height &&
    v1Decoded.info.channels === channels,
  "Unexpected v1 RGBA dimensions."
);
assert(
  v2Decoded.info.width === width &&
    v2Decoded.info.height === height &&
    v2Decoded.info.channels === channels,
  "Unexpected v2 RGBA dimensions."
);

let outsideExact = true;
for (let y = 0; y < height && outsideExact; y += 1) {
  const rowStart = y * rowBytes;
  if (y < allowed.y0 || y > allowed.y1) {
    outsideExact =
      v1Decoded.data.compare(
        v2Decoded.data,
        rowStart,
        rowStart + rowBytes,
        rowStart,
        rowStart + rowBytes
      ) === 0;
  } else {
    const prefixEnd = rowStart + allowed.x0 * channels;
    const suffixStart = rowStart + (allowed.x1 + 1) * channels;
    outsideExact =
      v1Decoded.data.compare(
        v2Decoded.data,
        rowStart,
        prefixEnd,
        rowStart,
        prefixEnd
      ) === 0 &&
      v1Decoded.data.compare(
        v2Decoded.data,
        suffixStart,
        rowStart + rowBytes,
        suffixStart,
        rowStart + rowBytes
      ) === 0;
  }
}

let changedPixels = 0;
const differenceBounds = { x0: width, y0: height, x1: -1, y1: -1 };
for (let y = allowed.y0; y <= allowed.y1; y += 1) {
  for (let x = allowed.x0; x <= allowed.x1; x += 1) {
    const offset = (y * width + x) * channels;
    let differs = false;
    for (let channel = 0; channel < channels; channel += 1) {
      if (v1Decoded.data[offset + channel] !== v2Decoded.data[offset + channel]) {
        differs = true;
        break;
      }
    }
    if (differs) {
      changedPixels += 1;
      differenceBounds.x0 = Math.min(differenceBounds.x0, x);
      differenceBounds.y0 = Math.min(differenceBounds.y0, y);
      differenceBounds.x1 = Math.max(differenceBounds.x1, x);
      differenceBounds.y1 = Math.max(differenceBounds.y1, y);
    }
  }
}

const pathCount = (svgText.match(/<path\b/g) ?? []).length;
const manifest = JSON.parse(manifestText);
const [pngHash, jpgHash] = await Promise.all([sha256(png), sha256(jpg)]);
const alpha = pngStats.channels[3];

assert(outsideExact, "Pixels changed outside the approved label rectangle.");
assert(changedPixels > 0, "No label pixels changed.");
assert(pngMeta.width === width && pngMeta.height === height, "PNG dimensions failed.");
assert(jpgMeta.width === width && jpgMeta.height === height, "JPG dimensions failed.");
assert(Math.abs(pngMeta.density - 300) < 0.01, "PNG density is not 300 DPI.");
assert(Math.abs(jpgMeta.density - 300) < 0.01, "JPG density is not 300 DPI.");
assert(pngMeta.space === "srgb" && jpgMeta.space === "srgb", "Output is not sRGB.");
assert(pngMeta.hasAlpha === true, "PNG is missing alpha.");
assert(jpgMeta.hasAlpha === false, "JPG unexpectedly has alpha.");
assert(alpha.min === 0 && alpha.max === 255, "PNG alpha range is incomplete.");
assert(jpgMeta.chromaSubsampling === "4:4:4", "JPG is not 4:4:4 chroma.");
assert(Buffer.isBuffer(pngMeta.icc) && pngMeta.icc.length > 0, "PNG ICC missing.");
assert(Buffer.isBuffer(jpgMeta.icc) && jpgMeta.icc.length > 0, "JPG ICC missing.");
assert(pathCount === 3, "SVG must contain exactly three glyph paths.");
assert(!/<text\b|<tspan\b|font-family\s*=/.test(svgText), "SVG still depends on fonts.");
assert(svgText.includes("#8B6754"), "SVG colour does not match #8B6754.");
assert(manifest.transparentPng.sha256 === pngHash, "PNG manifest hash mismatch.");
assert(manifest.darkJpeg.sha256 === jpgHash, "JPG manifest hash mismatch.");

console.log(
  JSON.stringify(
    {
      status: "PASS",
      allowedRectangle: allowed,
      pixelsOutsideRectangleAreByteIdentical: outsideExact,
      changedPixelsInsideRectangle: changedPixels,
      actualDifferenceBounds: differenceBounds,
      png: {
        width: pngMeta.width,
        height: pngMeta.height,
        density: pngMeta.density,
        colourSpace: pngMeta.space,
        alphaRange: [alpha.min, alpha.max],
        embeddedIccBytes: pngMeta.icc.length
      },
      jpg: {
        width: jpgMeta.width,
        height: jpgMeta.height,
        density: jpgMeta.density,
        colourSpace: jpgMeta.space,
        chromaSubsampling: jpgMeta.chromaSubsampling,
        embeddedIccBytes: jpgMeta.icc.length
      },
      svg: { outlinedGlyphPaths: pathCount, fontIndependent: true },
      hashesMatchManifest: true
    },
    null,
    2
  )
);
