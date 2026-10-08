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
const outputDirectory = path.join(
  root,
  "deliverables",
  "宣传流程图高清印刷包"
);

const scale = 8;
const sourceWidth = 1387;
const sourceHeight = 580;
const width = sourceWidth * scale;
const height = sourceHeight * scale;

const transparentName =
  "宣传流程图-原图保真-透明底-11096x4640-300dpi.png";
const darkName = "宣传流程图-原图保真-黑底-11096x4640-300dpi.jpg";
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

await sharp(source, { limitInputPixels: false })
  .ensureAlpha()
  .resize(width, height, {
    fit: "fill",
    kernel: sharp.kernel.lanczos3
  })
  .sharpen({ sigma: 0.8 })
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
  asset: "宣传流程图",
  method:
    "8× deterministic Lanczos3 resampling with restrained edge sharpening; artwork content unchanged",
  generatedAt: new Date().toISOString(),
  source: {
    file: originalName,
    width: sourceWidth,
    height: sourceHeight,
    density: "120 PPI"
  },
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
    "宣传流程图高清印刷包",
    "",
    "1. 黑色或深色宣传板：优先使用透明 PNG，由设计师放在版面背景上。",
    "2. 需要直接出图：使用黑底 JPG；黑底可保证原图中的白色线条和浅色结构清晰可见。",
    "3. 两个高清文件均为 11096×4640 px、300 PPI、sRGB，严格保持原图 1387:580 的比例和内容。",
    "4. 原始图片中的文字、图标、箭头和位置均未进行 AI 重绘，避免宣传信息被改写。",
    "5. 300 PPI 推荐最大印刷尺寸约 94.0×39.3 cm；150 PPI 约 187.9×78.6 cm。",
    "6. 若需要更大尺寸，建议请设计师依据此图重绘为矢量文件，而不是继续放大位图。",
    "",
    "注意：白底会降低原图中白色线条的可见度，因此本包不提供白底 JPG。",
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
