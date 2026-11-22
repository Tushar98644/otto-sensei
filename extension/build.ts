// bun extension/build.ts [dev|prod]: writes extension/dist/<target>/, and the Web Store zip for prod.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { manifest, ORIGINS, type BuildTarget } from "./manifest";

type BuildOutput = { path: string; size: number };
type BunBuild = (options: Record<string, unknown>) => Promise<{
  success: boolean;
  logs: unknown[];
  outputs: BuildOutput[];
}>;
// Bun's own bundler; typed here since the repo carries no Bun type package.
const bunBuild = (globalThis as unknown as { Bun: { build: BunBuild } }).Bun.build;

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const VERSION = (
  JSON.parse(readFileSync(path.join(ROOT, "version.json"), "utf8")) as { version: string }
).version;
const ENTRIES = ["background", "content", "bridge"].map((name) =>
  path.join(ROOT, "src", `${name}.ts`),
);

// OTTO_DEV_ORIGIN=http://localhost:<port> points a dev build at a dev server on another port.
function originFor(target: BuildTarget): string {
  const asked = process.env.OTTO_DEV_ORIGIN?.trim();
  if (target !== "dev" || !asked) return ORIGINS[target];
  if (!/^http:\/\/localhost:\d{2,5}$/.test(asked)) {
    throw new Error("OTTO_DEV_ORIGIN must look like http://localhost:3314");
  }
  return asked;
}

async function build(target: BuildTarget): Promise<string> {
  const out = path.join(ROOT, "dist", target);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const result = await bunBuild({
    entrypoints: ENTRIES,
    outdir: out,
    target: "browser",
    format: "iife",
    minify: target === "prod",
    sourcemap: target === "dev" ? "inline" : "none",
    define: {
      __OTTO_ORIGIN__: JSON.stringify(originFor(target)),
      __OTTO_DEV__: JSON.stringify(target === "dev"),
      "process.env.NODE_ENV": JSON.stringify(target === "prod" ? "production" : "development"),
    },
  });
  if (!result.success) {
    for (const message of result.logs) console.error(message);
    throw new Error(`extension build (${target}) failed`);
  }
  writeFileSync(
    path.join(out, "manifest.json"),
    `${JSON.stringify(manifest(target, VERSION, originFor(target)), null, 2)}\n`,
  );
  cpSync(path.join(ROOT, "store", "icons"), path.join(out, "icons"), {
    recursive: true,
    filter: (file) => !file.endsWith("-store.png") && !file.includes("promo"),
  });
  const sizes = result.outputs.map(
    (file) => `${path.basename(file.path)} ${(file.size / 1024).toFixed(1)} KB`,
  );
  console.log(`${target}: ${out} (${sizes.join(", ")})`);
  return out;
}

async function zip(dir: string): Promise<void> {
  const archive = new JSZip();
  const files = readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
    .sort();
  for (const file of files) archive.file(file, readFileSync(path.join(dir, file)));
  const bytes = await archive.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const name = path.join(ROOT, "dist", `otto-for-chrome-${VERSION}.zip`);
  writeFileSync(name, bytes);
  console.log(`zip: ${name} (${(bytes.length / 1024).toFixed(1)} KB)`);
}

const asked = process.argv[2];
const targets: BuildTarget[] = asked === "dev" || asked === "prod" ? [asked] : ["dev", "prod"];
for (const target of targets) {
  const dir = await build(target);
  if (target === "prod") await zip(dir);
}
