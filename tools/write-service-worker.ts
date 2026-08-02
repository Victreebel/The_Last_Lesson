import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("dist");

async function listFiles(directory: string, relativeDirectory = ""): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(fullPath, relativePath) : [relativePath];
    })
  );
  return files.flat();
}

const outputFiles = (await listFiles(outputDirectory)).filter((file) => file !== "sw.js").sort();
const cacheKey = createHash("sha256");

for (const file of outputFiles) {
  cacheKey.update(file);
  cacheKey.update(await readFile(path.join(outputDirectory, file)));
}

const cacheName = `the-last-lesson-${cacheKey.digest("hex").slice(0, 16)}`;
const precachePaths = ["./", ...outputFiles.map((file) => `./${file}`)];

const worker = `const CACHE_NAME = ${JSON.stringify(cacheName)};
const PRECACHE_PATHS = ${JSON.stringify(precachePaths)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_PATHS.map((path) => new URL(path, self.registration.scope).toString())))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("the-last-lesson-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (
      (await cache.match(request, { ignoreVary: true })) ??
      (await cache.match(new URL("./", self.registration.scope).toString(), { ignoreVary: true }))
    );
  }
}
`;

await writeFile(path.join(outputDirectory, "sw.js"), worker);
