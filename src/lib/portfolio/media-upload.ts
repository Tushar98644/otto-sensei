import { fail } from "@/lib/api/respond";
import { webHref } from "./content";
import { MEDIA_KINDS, MEDIA_LIMITS, MEDIA_MESSAGES, sniffImageType, type MediaKind } from "./media";

// Server-only. Reading one picture out of a multipart upload, and fetching a website's icon,
// both capped so neither can make the server hold more than a few megabytes.

// Room for the multipart boundary and the "kind" field around a file right at the limit.
const MAX_BODY_BYTES = MEDIA_LIMITS.maxUploadBytes + 64 * 1024;

export type ImageUpload = { bytes: Uint8Array; kind: MediaKind };

async function readCapped(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<Uint8Array | "too_large" | null> {
  if (!body) return new Uint8Array(0);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return "too_large";
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return bytes;
}

/** The "file" and "kind" fields, size- and type-checked; a finished error Response otherwise. */
export async function readImageUpload(req: Request): Promise<ImageUpload | Response> {
  const type = req.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\b/i.test(type))
    return fail("bad_request", MEDIA_MESSAGES.noFile, 400);
  if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) {
    return fail("too_large", MEDIA_MESSAGES.tooLarge, 413);
  }
  const body = await readCapped(req.body, MAX_BODY_BYTES);
  if (body === "too_large") return fail("too_large", MEDIA_MESSAGES.tooLarge, 413);
  if (body === null)
    return fail("bad_request", "The upload didn't come through. Please try again.", 400);
  let form: FormData;
  try {
    form = await new Response(body as Uint8Array<ArrayBuffer>, {
      headers: { "content-type": type },
    }).formData();
  } catch {
    return fail("bad_request", MEDIA_MESSAGES.noFile, 400);
  }
  const file = form.get("file");
  const kind = form.get("kind");
  if (file === null || typeof file === "string" || file.size === 0) {
    return fail("bad_request", MEDIA_MESSAGES.noFile, 400);
  }
  if (typeof kind !== "string" || !(MEDIA_KINDS as readonly string[]).includes(kind)) {
    return fail("bad_request", "Say what the picture is for.", 400);
  }
  if (file.size > MEDIA_LIMITS.maxUploadBytes)
    return fail("too_large", MEDIA_MESSAGES.tooLarge, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  // The first bytes decide, never the file name or the type the browser sent.
  if (!sniffImageType(bytes)) return fail("unsupported_type", MEDIA_MESSAGES.type, 415);
  return { bytes, kind: kind as MediaKind };
}

// Only this service is ever fetched, so a website address typed by the owner can't point the
// server at anything else (no private addresses, no redirects to them). 404 means "no icon".
const ICON_SERVICE = "https://www.google.com/s2/favicons";
const ICON_HOSTS = /^(?:www\.google\.com|t\d\.gstatic\.com|[a-z\d-]+\.gstatic\.com)$/;
const MAX_ICON_BYTES = 256 * 1024;

/** The site's icon as image bytes, or null when it has none (the page then shows a monogram). */
export async function fetchSiteIcon(siteUrl: string): Promise<Uint8Array | null> {
  const href = webHref(siteUrl);
  if (!href) return null;
  const host = new URL(href).hostname;
  let url = `${ICON_SERVICE}?domain=${encodeURIComponent(host)}&sz=128`;
  for (let hop = 0; hop < 3; hop++) {
    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5_000) });
    } catch {
      return null;
    }
    if ([301, 302, 307, 308].includes(res.status)) {
      await res.body?.cancel();
      const next = res.headers.get("location");
      if (!next) return null;
      const target = new URL(next, url);
      if (target.protocol !== "https:" || !ICON_HOSTS.test(target.hostname)) return null;
      url = target.href;
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    const bytes = await readCapped(res.body, MAX_ICON_BYTES);
    if (!(bytes instanceof Uint8Array) || !sniffImageType(bytes)) return null;
    return bytes;
  }
  return null;
}
