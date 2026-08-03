import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const archive = path.resolve(process.argv[2] ?? "release/the-last-lesson-web.zip");

function fail(message: string): never {
  throw new Error(`Storefront package invalid: ${message}`);
}

if (!existsSync(archive)) {
  fail(`archive not found at ${archive}`);
}
if (statSync(archive).size < 100_000) {
  fail("archive is unexpectedly small");
}

const list = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" })
  .split(/\r?\n/)
  .map((entry) => entry.trim())
  .filter(Boolean);
const entries = new Set(list);
const requiredRootEntries = ["index.html", "manifest.webmanifest", "sw.js", "icons/the-last-lesson-192.png", "icons/the-last-lesson-512.png"];
for (const entry of requiredRootEntries) {
  if (!entries.has(entry)) {
    fail(`missing ${entry}`);
  }
}
if (!list.some((entry) => /^assets\/index-[\w-]+\.js$/.test(entry))) {
  fail("missing application JavaScript chunk");
}
if (!list.some((entry) => /^assets\/phaser-[\w-]+\.js$/.test(entry))) {
  fail("missing Phaser runtime chunk");
}
if (!list.some((entry) => /^assets\/painterly-battlefield-v1\.webp$/.test(entry))) {
  fail("missing painterly battlefield asset");
}
if (!list.some((entry) => /^assets\/campaign-theatres-v1\.webp$/.test(entry))) {
  fail("missing painterly campaign theatre asset");
}

const readArchiveEntry = (entry: string): string => execFileSync("unzip", ["-p", archive, entry], { encoding: "utf8" });
const index = readArchiveEntry("index.html");
if (index.includes('src="/src/') || index.includes('href="/assets/')) {
  fail("index.html retains an absolute development asset path");
}

for (const match of index.matchAll(/(?:src|href)="\.\/([^"?#]+)(?:[?#][^"]*)?"/g)) {
  const reference = match[1];
  if (!entries.has(reference)) {
    fail(`index.html references missing ${reference}`);
  }
}

const manifest = JSON.parse(readArchiveEntry("manifest.webmanifest")) as { start_url?: unknown; scope?: unknown; icons?: unknown };
if (manifest.start_url !== "./" || manifest.scope !== "./" || !Array.isArray(manifest.icons)) {
  fail("manifest is not scoped for a portable relative-path upload");
}

console.log(`Storefront package verified: ${path.basename(archive)} (${list.length} files).`);
