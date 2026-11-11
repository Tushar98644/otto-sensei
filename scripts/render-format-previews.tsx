// Draws page 1 of every PDF format, filled with the sample resume on Letter, into
// public/formats/<id>.png (600px wide) and <id>@2x.png (1200px), plus the WebP copies the app
// serves (<id>-400.webp, -800 and -1200), for the Formats gallery.
//
//   bun scripts/render-format-previews.tsx
//
// The PDFs come from the real templates, filled with the same sample "Try it with a sample" opens
// in the gallery. Headless Chrome turns them into pictures with pdf.js (the copy unpdf bundles),
// so nothing extra gets installed. Re-run it after changing a template.
// Env: CHROME_PATH, CHROME_DEBUG_PORT (default 9335), PREVIEW_PROFILE_DIR (Chrome's throwaway
// profile; deleted at the end).

import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderToBuffer } from "@react-pdf/renderer";
import sharp from "sharp";
import { sampleWithFormat } from "../src/components/formats/apply-format";
import { RESUME_TEMPLATE_LIST } from "../src/components/pdf/registry";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = join(ROOT, "public", "formats");
const PDFJS = join(ROOT, "node_modules", "unpdf", "dist", "pdfjs.mjs");
const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.env.CHROME_DEBUG_PORT ?? 9335);
const PROFILE = process.env.PREVIEW_PROFILE_DIR ?? join(tmpdir(), "otto-format-previews");
const WIDTHS = [
  { width: 600, suffix: "" },
  { width: 1200, suffix: "@2x" },
] as const;
const WEBP_WIDTHS = [400, 800, 1200] as const;
// A fixed clock keeps the sample's ids out of the picture and the output stable between runs.
const SAMPLE_TIME = Date.UTC(2026, 0, 15);

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };
type CdpReply = { id?: number; result?: unknown; error?: { message: string } };
type Evaluated = {
  result: { value?: unknown };
  exceptionDetails?: { text: string; exception?: { description?: string } };
};
type Target = { type: string; url: string; webSocketDebuggerUrl?: string };
type Drawn = { dataUrl: string; inked: number };

// Just enough of the Chrome DevTools Protocol: numbered requests over one page's WebSocket.
class Cdp {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener("message", (event) => {
      const reply = JSON.parse(String(event.data)) as CdpReply;
      const waiting = reply.id === undefined ? undefined : this.pending.get(reply.id);
      if (!waiting || reply.id === undefined) return;
      this.pending.delete(reply.id);
      if (reply.error) waiting.reject(new Error(reply.error.message));
      else waiting.resolve(reply.result);
    });
  }

  static connect(url: string): Promise<Cdp> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      socket.addEventListener("open", () => resolve(new Cdp(socket)), { once: true });
      socket.addEventListener("error", () => reject(new Error(`Can't reach ${url}`)), {
        once: true,
      });
    });
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression: string): Promise<unknown> {
    const reply = (await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })) as Evaluated;
    if (reply.exceptionDetails) {
      const { text, exception } = reply.exceptionDetails;
      throw new Error(exception?.description ?? text);
    }
    return reply.result.value;
  }

  close() {
    this.socket.close();
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor<T>(
  what: string,
  probe: () => Promise<T | null>,
  timeoutMs = 20_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await probe().catch(() => null);
    if (value !== null) return value;
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${what}`);
}

// pdf.js ships as an ES module. Inlined into the page (a file:// page can't import modules), its
// export list becomes one global object.
async function harnessHtml(): Promise<string> {
  const source = await readFile(PDFJS, "utf8");
  const exportList = /export\s*\{([^}]*)\};?\s*$/.exec(source);
  if (!exportList?.[1]) throw new Error("Unexpected pdf.js build: no export list at the end");
  const members = exportList[1]
    .split(",")
    .map((spec) => spec.trim())
    .filter(Boolean)
    .map((spec) => {
      const [local, exported] = spec.split(/\s+as\s+/);
      return exported ? `${JSON.stringify(exported)}: ${local}` : spec;
    });
  const library = `${source.slice(0, exportList.index)}\nglobalThis.pdfjsLib = { ${members.join(", ")} };`;
  return `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#fff">
<script type="module">
${library}
globalThis.drawPage = async (base64, width) => {
  const data = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const pdf = await globalThis.pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let inked = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 200) inked++;
    return { dataUrl: canvas.toDataURL("image/png"), inked: inked / (pixels.length / 4) };
  } finally {
    await pdf.loadingTask.destroy();
  }
};
globalThis.harnessReady = true;
</script>
</body></html>`;
}

async function samplePdfs(): Promise<{ id: string; name: string; base64: string }[]> {
  const pdfs = [];
  for (const template of RESUME_TEMPLATE_LIST) {
    const resume = sampleWithFormat(template.id, SAMPLE_TIME);
    const { Component } = template;
    const bytes = await renderToBuffer(<Component resume={resume} pageSize="LETTER" />);
    pdfs.push({
      id: template.id,
      name: template.name,
      base64: Buffer.from(bytes).toString("base64"),
    });
  }
  return pdfs;
}

async function main() {
  const pdfs = await samplePdfs();
  await rm(PROFILE, { recursive: true, force: true });
  await mkdir(PROFILE, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });
  const harness = join(PROFILE, "harness.html");
  await writeFile(harness, await harnessHtml());

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      "--remote-allow-origins=*",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "--mute-audio",
      pathToFileURL(harness).href,
    ],
    { stdio: "ignore" },
  );
  const exited = new Promise<void>((resolve) => chrome.once("exit", () => resolve()));
  let cdp: Cdp | null = null;
  try {
    const target = await waitFor("the Chrome page", async () => {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = (await response.json()) as Target[];
      return (
        targets.find((item) => item.type === "page" && item.url.endsWith("harness.html")) ?? null
      );
    });
    if (!target.webSocketDebuggerUrl) throw new Error("Chrome gave no debugger URL");
    cdp = await Cdp.connect(target.webSocketDebuggerUrl);
    const page = cdp;
    await waitFor("pdf.js to load", async () =>
      (await page.evaluate("globalThis.harnessReady === true")) ? true : null,
    );

    for (const pdf of pdfs) {
      for (const { width, suffix } of WIDTHS) {
        const drawn = (await page.evaluate(
          `drawPage(${JSON.stringify(pdf.base64)}, ${width})`,
        )) as Drawn;
        // A page that came out blank or failed to draw text would sail through otherwise.
        if (drawn.inked < 0.005) throw new Error(`${pdf.name} came out blank at ${width}px`);
        const file = join(OUT_DIR, `${pdf.id}${suffix}.png`);
        await writeFile(
          file,
          Buffer.from(drawn.dataUrl.replace(/^data:image\/png;base64,/, ""), "base64"),
        );
        console.log(`${pdf.name}: ${file} (${(drawn.inked * 100).toFixed(1)}% ink)`);
      }
      for (const width of WEBP_WIDTHS) {
        await sharp(join(OUT_DIR, `${pdf.id}@2x.png`))
          .resize({ width })
          .webp({ quality: 82 })
          .toFile(join(OUT_DIR, `${pdf.id}-${width}.webp`));
      }
    }
  } finally {
    cdp?.close();
    chrome.kill("SIGTERM");
    await Promise.race([exited, sleep(5_000)]);
    if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill("SIGKILL");
    await rm(PROFILE, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
