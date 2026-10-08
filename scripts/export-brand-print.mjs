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
const outputDirectory = path.join(
  root,
  "deliverables",
  "首版认证-Logo高清印刷包"
);

const exports = [
  {
    key: "mark",
    source: path.join(root, "public", "brand", "shouban-mark.svg"),
    vectorName: "首版认证-图形标-矢量.svg",
    jpegName: "首版认证-图形标-白底-6240x6240-300dpi.jpg",
    pngName: "首版认证-图形标-透明底-6240x6240-300dpi.png",
    width: 6240,
    height: 6240
  },
  {
    key: "horizontal",
    source: path.join(
      outputDirectory,
      "首版认证-横版Logo-文字转曲-矢量.svg"
    ),
    vectorName: "首版认证-横版Logo-文字转曲-矢量.svg",
    jpegName: "首版认证-横版Logo-白底-12032x3328-300dpi.jpg",
    pngName: "首版认证-横版Logo-透明底-12032x3328-300dpi.png",
    width: 12032,
    height: 3328
  }
];

function setSvgPixelSize(svg, width, height) {
  return svg.replace(
    /<svg\b/,
    `<svg width="${width}" height="${height}"`
  );
}

async function sha256(filePath) {
  const data = await readFile(filePath);
  return createHash("sha256").update(data).digest("hex");
}

async function renderExport(item) {
  const svg = await readFile(item.source, "utf8");
  const sizedSvg = Buffer.from(
    setSvgPixelSize(svg, item.width, item.height),
    "utf8"
  );
  const jpegPath = path.join(outputDirectory, item.jpegName);
  const pngPath = path.join(outputDirectory, item.pngName);
  const vectorPath = path.join(outputDirectory, item.vectorName);

  if (path.resolve(item.source) !== path.resolve(vectorPath)) {
    await copyFile(item.source, vectorPath);
  }

  await sharp(sizedSvg, { limitInputPixels: false })
    .flatten({ background: "#FFFFFF" })
    .jpeg({
      quality: 100,
      chromaSubsampling: "4:4:4",
      mozjpeg: true
    })
    .withMetadata({ density: 300 })
    .toFile(jpegPath);

  await sharp(sizedSvg, { limitInputPixels: false })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .withMetadata({ density: 300 })
    .toFile(pngPath);

  const [jpegMetadata, pngMetadata] = await Promise.all([
    sharp(jpegPath).metadata(),
    sharp(pngPath).metadata()
  ]);

  return {
    key: item.key,
    vector: item.vectorName,
    jpeg: {
      file: item.jpegName,
      width: jpegMetadata.width,
      height: jpegMetadata.height,
      density: jpegMetadata.density,
      format: jpegMetadata.format,
      colourSpace: jpegMetadata.space,
      sha256: await sha256(jpegPath)
    },
    png: {
      file: item.pngName,
      width: pngMetadata.width,
      height: pngMetadata.height,
      density: pngMetadata.density,
      format: pngMetadata.format,
      colourSpace: pngMetadata.space,
      hasAlpha: pngMetadata.hasAlpha,
      sha256: await sha256(pngPath)
    }
  };
}

await mkdir(outputDirectory, { recursive: true });

const manifest = {
  brand: "首版认证",
  generatedAt: new Date().toISOString(),
  colourProfile: "sRGB IEC61966-2.1",
  density: "300 PPI",
  colours: {
    navy: "#0B132B",
    cobalt: "#3347B8",
    jpegBackground: "#FFFFFF"
  },
  exports: []
};

for (const item of exports) {
  manifest.exports.push(await renderExport(item));
}

await writeFile(
  path.join(outputDirectory, "印刷使用说明.txt"),
  [
    "首版认证 Logo 高清印刷包",
    "",
    "1. 白色或浅色宣传板：优先使用白底 JPG，已固定为 300 PPI、最高质量、4:4:4 色度采样。",
    "2. 彩色或复杂背景：使用透明 PNG，避免出现白色方框。",
    "3. 印厂排版软件支持 SVG 时：优先使用矢量 SVG，可无限放大。横版 SVG 的中文已转为轮廓，不依赖印厂字体。",
    "4. 色彩空间为 sRGB。若印厂要求 CMYK，请让印厂按其设备 ICC 配置转换，不要使用无配置的通用 CMYK 转换。",
    "5. 品牌色：深海军蓝 #0B132B；钴蓝 #3347B8。禁止拉伸变形、改色、加阴影或描边。",
    "",
    "推荐最大印刷尺寸：",
    "- 图形标 6240×6240 px：300 PPI 约 52.8×52.8 cm；150 PPI 约 105.7×105.7 cm。",
    "- 横版 12032×3328 px：300 PPI 约 101.9×28.2 cm；150 PPI 约 203.7×56.4 cm。",
    "",
    "若宣传板上的 Logo 尺寸超过上述范围，请直接使用矢量 SVG。",
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
