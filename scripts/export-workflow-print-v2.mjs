import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const source = String.raw`C:\Users\72343\Documents\xwechat_files\wxid_ap9ofol4utcy22_5486\temp\RWTemp\2026-09\13d4a05219a2939b2fb7126ba5817589\08ae461e8abd70edb5ad28923a1fc04f.png`;
const highResolutionBase = path.join(
  root,
  "deliverables",
  "宣传流程图高清印刷包",
  "宣传流程图-原图保真-透明底-11096x4640-300dpi.png"
);
const outputDirectory = path.join(
  root,
  "deliverables",
  "宣传流程图高清印刷包-v2-小字增强"
);
const labelSource = path.join(
  outputDirectory,
  "宣传流程图-管理难文字层-矢量.svg"
);

const sourceWidth = 1387;
const sourceHeight = 580;
const scale = 8;
const width = sourceWidth * scale;
const height = sourceHeight * scale;

const transparentName =
  "宣传流程图-小字增强-透明底-11096x4640-300dpi.png";
const darkName = "宣传流程图-小字增强-黑底-11096x4640-300dpi.jpg";
const originalName = "宣传流程图-原始文件-1387x580.png";

async function sha256(filePath) {
  const data = await readFile(filePath);
  return createHash("sha256").update(data).digest("hex");
}

await mkdir(outputDirectory, { recursive: true });

const transparentPath = path.join(outputDirectory, transparentName);
const darkPath = path.join(outputDirectory, darkName);
const originalPath = path.join(outputDirectory, originalName);

await copyFile(source, originalPath);

const region = {
  sourceX: 169,
  sourceY: 184,
  sourceWidth: 63,
  sourceHeight: 27
};
const regionWidth = region.sourceWidth * scale;
const regionHeight = region.sourceHeight * scale;
const regionX = region.sourceX * scale;
const regionY = region.sourceY * scale;

const { data: basePixels, info: baseInfo } = await sharp(
  highResolutionBase,
  { limitInputPixels: false }
)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

if (
  baseInfo.width !== width ||
  baseInfo.height !== height ||
  baseInfo.channels !== 4
) {
  throw new Error("Unexpected high-resolution base dimensions or channels.");
}

const labelSvg = (await readFile(labelSource, "utf8")).replace(
  /<svg\b[^>]*>/,
  `<svg xmlns="http://www.w3.org/2000/svg" width="${regionWidth}" height="${regionHeight}" viewBox="${region.sourceX} ${region.sourceY} ${region.sourceWidth} ${region.sourceHeight}">`
);
const { data: labelPixels, info: labelInfo } = await sharp(
  Buffer.from(labelSvg, "utf8")
)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

if (
  labelInfo.width !== regionWidth ||
  labelInfo.height !== regionHeight ||
  labelInfo.channels !== 4
) {
  throw new Error("Unexpected label layer dimensions or channels.");
}

for (let row = 0; row < regionHeight; row += 1) {
  const sourceStart = row * regionWidth * 4;
  const targetStart = ((regionY + row) * width + regionX) * 4;
  labelPixels.copy(
    basePixels,
    targetStart,
    sourceStart,
    sourceStart + regionWidth * 4
  );
}

await sharp(basePixels, {
  raw: { width, height, channels: 4 },
  limitInputPixels: false
})
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .withMetadata({ density: 300 })
  .toFile(transparentPath);

await sharp(transparentPath, { limitInputPixels: false })
  .flatten({ background: "#000000" })
  .jpeg({
    quality: 100,
    chromaSubsampling: "4:4:4",
    mozjpeg: true
  })
  .withMetadata({ density: 300 })
  .toFile(darkPath);

const [transparentMetadata, darkMetadata] = await Promise.all([
  sharp(transparentPath).metadata(),
  sharp(darkPath).metadata()
]);

const manifest = {
  asset: "宣传流程图 - 小字增强版",
  edit: {
    text: "管理难",
    method: "Microsoft YaHei Bold glyph outlines",
    sourceBounds: "40×12 px",
    replacementFontSize: "16 px source-equivalent",
    colour: "#8B6754",
    scope: "left circular module centre label only"
  },
  generatedAt: new Date().toISOString(),
  transparentPng: {
    file: transparentName,
    width: transparentMetadata.width,
    height: transparentMetadata.height,
    density: transparentMetadata.density,
    colourSpace: transparentMetadata.space,
    hasAlpha: transparentMetadata.hasAlpha,
    sha256: await sha256(transparentPath)
  },
  darkJpeg: {
    file: darkName,
    width: darkMetadata.width,
    height: darkMetadata.height,
    density: darkMetadata.density,
    colourSpace: darkMetadata.space,
    background: "#000000",
    sha256: await sha256(darkPath)
  }
};

await writeFile(
  path.join(outputDirectory, "印刷使用说明.txt"),
  [
    "宣传流程图高清印刷包 v2｜小字增强",
    "",
    "本版只重绘左侧圆环中心的“管理难”三个字：由原始约 40×12 px 小字替换为中文矢量轮廓，字号提升约 23%，位置居中，颜色保持 #8B6754。",
    "其余图标、箭头、线条、颜色、透明区域和位置均来自原图，不使用 AI 重绘。",
    "",
    "- 透明 PNG：用于设计排版，11096×4640 px、300 PPI、sRGB。",
    "- 黑底 JPG：用于直接出图，11096×4640 px、300 PPI、sRGB。",
    "- 管理难文字层 SVG：保留三个中文字的矢量轮廓，便于后续设计调整。",
    "",
    "300 PPI 推荐最大印刷尺寸约 94.0×39.3 cm；150 PPI 约 187.9×78.6 cm。",
    ""
  ].join("\r\n"),
  "utf8"
);

await writeFile(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

console.log(JSON.stringify(manifest, null, 2));
