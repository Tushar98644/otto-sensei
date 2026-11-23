import { promises as dns } from "node:dns";
import { isIP } from "node:net";
import { isPublicAddress } from "./address";
import { JobReadError } from "./errors";
import { sendPinned, type ResolvedAddress } from "./transport";
import { toFetchableUrl } from "./url";

// URL rules run on every redirect; every DNS answer must be public and is what we connect to.

export const FETCH_LIMITS = {
  timeoutMs: 8_000,
  maxBytes: 2 * 1024 * 1024,
  maxRedirects: 3,
} as const;
export const USER_AGENT = "OttoResumeBot/1.0";

export type FetchKind = "html" | "json" | "xml" | "text";

export type FetchOptions = {
  kind: FetchKind;
  maxBytes?: number;
  deadline?: number;
  timeoutMs?: number;
  // Sent as a JSON POST; a redirect is then refused rather than replayed elsewhere.
  json?: unknown;
  // A keyed API's own headers (USAJOBS wants its key and the registered email as the user agent).
  headers?: Record<string, string>;
};

export type Fetched = { url: URL; body: string };

const MEDIA_TYPES: Record<FetchKind, readonly string[]> = {
  html: ["text/html"],
  json: ["application/json"],
  xml: ["application/xml", "text/xml"],
  text: ["text/plain"],
};
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

function errorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return null;
}

function statusError(status: number): JobReadError {
  if (status === 401) return new JobReadError("login_required");
  // 999 is LinkedIn's answer to anything it takes for a bot.
  if (status === 403 || status === 429 || status === 999) return new JobReadError("blocked");
  if (status === 404 || status === 410) return new JobReadError("not_found");
  return new JobReadError("unreachable", { detail: `http_${status}` });
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new Error("Aborted"));
    if (signal.aborted) onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

async function resolvePublic(url: URL, signal: AbortSignal): Promise<ResolvedAddress[]> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const literal = isIP(host);
  if (literal) return [{ address: host, family: literal === 6 ? 6 : 4 }];

  let answers: { address: string; family: number }[];
  try {
    answers = await abortable(dns.lookup(host, { all: true, verbatim: true }), signal);
  } catch (error) {
    if (signal.aborted) throw error;
    throw new JobReadError("unreachable", { detail: errorCode(error) ?? "dns" });
  }
  if (answers.length === 0) throw new JobReadError("unreachable", { detail: "dns" });
  // The connection may use any of the answers, so one private answer refuses the host.
  if (answers.some((answer) => !isPublicAddress(answer.address)))
    throw new JobReadError("private_address");
  return answers.map(({ address, family }) => ({ address, family: family === 6 ? 6 : 4 }));
}

// Each read races the deadline: a stalled body may never notice the abort.
async function readCapped(
  body: AsyncIterable<Uint8Array>,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  const iterator = body[Symbol.asyncIterator]();
  try {
    for (;;) {
      const next = await abortable(iterator.next(), signal);
      if (next.done) break;
      size += next.value.byteLength;
      if (size > maxBytes) throw new JobReadError("too_large");
      chunks.push(next.value);
    }
  } finally {
    void iterator.return?.()?.catch(() => undefined);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function decodeText(bytes: Uint8Array, contentType: string): string {
  const charset = /charset\s*=\s*"?([\w.:-]+)/i.exec(contentType)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function redirectTarget(location: string, from: URL): URL {
  try {
    return toFetchableUrl(location, from);
  } catch (error) {
    if (error instanceof JobReadError && error.reason === "invalid_url") {
      throw new JobReadError("unreachable", { detail: "bad_redirect" });
    }
    throw error;
  }
}

export async function safeFetch(
  start: URL,
  {
    kind,
    maxBytes = FETCH_LIMITS.maxBytes,
    deadline = Number.POSITIVE_INFINITY,
    timeoutMs = FETCH_LIMITS.timeoutMs,
    json,
    headers: extra = {},
  }: FetchOptions,
): Promise<Fetched> {
  const budget = Math.min(timeoutMs, deadline - Date.now());
  if (budget <= 0) throw new JobReadError("timeout");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budget);
  const body = json === undefined ? undefined : JSON.stringify(json);
  const headers: Record<string, string> = {
    "user-agent": USER_AGENT,
    accept: MEDIA_TYPES[kind].join(", "),
    // Some Workday sites answer their job search with a 500 for a bare "en".
    "accept-language": body === undefined ? "en" : "en-US,en;q=0.9",
    "accept-encoding": "gzip, deflate, br",
    ...(body === undefined
      ? {}
      : {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(body)),
        }),
    ...extra,
  };

  try {
    let url = toFetchableUrl(start);
    for (let redirects = 0; ; redirects++) {
      const addresses = await resolvePublic(url, controller.signal);
      const res = await sendPinned({ url, addresses, headers, body, signal: controller.signal });

      if (REDIRECTS.has(res.status)) {
        res.discard();
        if (body !== undefined) throw new JobReadError("unreachable", { detail: "post_redirect" });
        const location = res.header("location");
        if (!location)
          throw new JobReadError("unreachable", { detail: "redirect_without_location" });
        if (redirects >= FETCH_LIMITS.maxRedirects)
          throw new JobReadError("unreachable", { detail: "too_many_redirects" });
        url = redirectTarget(location, url);
        continue;
      }
      if (res.status < 200 || res.status > 299) {
        res.discard();
        throw statusError(res.status);
      }

      const contentType = res.header("content-type") ?? "";
      const mediaType = contentType.split(";")[0]!.trim().toLowerCase();
      if (!MEDIA_TYPES[kind].includes(mediaType)) {
        res.discard();
        throw new JobReadError(kind === "html" ? "not_a_page" : "unreachable", {
          detail: mediaType || "no_type",
        });
      }
      if (Number(res.header("content-length")) > maxBytes) {
        res.discard();
        throw new JobReadError("too_large");
      }
      const bytes = await readCapped(res.body, maxBytes, controller.signal);
      return { url, body: decodeText(bytes, contentType) };
    }
  } catch (error) {
    if (error instanceof JobReadError) throw error;
    if (controller.signal.aborted) throw new JobReadError("timeout");
    throw new JobReadError("unreachable", { detail: errorCode(error) });
  } finally {
    clearTimeout(timer);
  }
}
