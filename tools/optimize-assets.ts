import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDirectory = path.resolve("art/source");
const publicDirectory = path.resolve("public/assets");

interface WebpAsset {
  readonly source: string;
  readonly output: string;
  readonly quality: number;
}

const webpAssets: readonly WebpAsset[] = [
  { source: "painterly-battlefield-v1.png", output: "painterly-battlefield-v1.webp", quality: 82 },
  { source: "building-atlas-v1.png", output: "building-atlas-v1.webp", quality: 86 },
  { source: "unit-atlas-v1.png", output: "unit-atlas-v1.webp", quality: 86 },
  { source: "campaign-theatres-v1.png", output: "campaign-theatres-v1.webp", quality: 84 }
];

await mkdir(publicDirectory, { recursive: true });

await Promise.all(
  webpAssets.map(({ source, output, quality }) =>
    sharp(path.join(sourceDirectory, source)).webp({ quality, alphaQuality: 92, effort: 6 }).toFile(path.join(publicDirectory, output))
  )
);

await sharp(path.join(sourceDirectory, "painterly-battlefield-v1.png"))
  .resize({ width: 1200, height: 630, fit: "cover", position: "attention" })
  .jpeg({ quality: 84, progressive: true, mozjpeg: true })
  .toFile(path.join(publicDirectory, "the-last-lesson-social.jpg"));
