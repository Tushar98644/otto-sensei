import { env } from "@/lib/env";
import { cacheGet, cacheSet, isFresh } from "./cache";

// Only https://api.github.com is ever fetched: paths come from names that passed strict patterns,
// and redirects are followed only on that origin. Each request's session allows 10 upstream calls.

const ORIGIN = "https://api.github.com";
const API_VERSION = "2022-11-28";
// GitHub turns away requests without a User-Agent.
const USER_AGENT = "otto-resume-github-import";
export const MAX_CALLS_PER_REQUEST = 10;
const CALL_TIMEOUT_MS = 6_000;
// 100 repos with every URL GitHub lists for each run to about 1 MB.
export const MAX_JSON_BYTES = 3 * 1024 * 1024;

const REPO_NAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}\/(?!\.+$)[\w.-]{1,100}$/i;
export const REPOS_PREFIX = `${ORIGIN}/repos/`;

export type GitHubErrorReason = "not_found" | "rate_limited" | "unavailable" | "over_budget";

export class GitHubError extends Error {
  readonly reason: GitHubErrorReason;
  readonly retryAfterMs: number | null;

  constructor(reason: GitHubErrorReason, message: string, retryAfterMs: number | null = null) {
    super(message);
    this.name = "GitHubError";
    this.reason = reason;
    this.retryAfterMs = retryAfterMs;
  }
}

export type GitHubSession = { calls: number; readonly maxCalls: number; readonly deadline: number };

export function newGitHubSession(budgetMs: number, now = Date.now()): GitHubSession {
  return { calls: 0, maxCalls: MAX_CALLS_PER_REQUEST, deadline: now + budgetMs };
}

export function isRepoName(value: string): boolean {
  return REPO_NAME.test(value);
}

export function repoPath(fullName: string, rest: string): string {
  const [owner = "", name = ""] = fullName.split("/");
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}${rest}`;
}

function headersFor(accept: string, etag: string | null): Headers {
  const headers = new Headers({
    Accept: accept,
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": USER_AGENT,
  });
  // Raises GitHub's limit from 60 to 5,000 calls an hour.
  const token = env().GITHUB_TOKEN;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (etag) headers.set("If-None-Match", etag);
  return headers;
}

function sameOriginUrl(location: string, base: string): string | null {
  try {
    const url = new URL(location, base);
    return url.origin === ORIGIN && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

async function call(session: GitHubSession, path: string, accept: string, etag: string | null) {
  let url = `${ORIGIN}${path}`;
  for (let hop = 0; ; hop++) {
    if (session.calls >= session.maxCalls) {
      throw new GitHubError("over_budget", "This request already used its GitHub calls");
    }
    const remaining = session.deadline - Date.now();
    if (remaining <= 0) throw new GitHubError("unavailable", "Ran out of time waiting for GitHub");
    session.calls += 1;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: headersFor(accept, etag),
        redirect: "manual",
        signal: AbortSignal.timeout(Math.min(CALL_TIMEOUT_MS, remaining)),
      });
    } catch {
      throw new GitHubError("unavailable", "GitHub didn't answer");
    }
    if (![301, 302, 307, 308].includes(res.status)) return res;
    // Renamed accounts and repos redirect to their new API address, once.
    const next = sameOriginUrl(res.headers.get("location") ?? "", url);
    await res.body?.cancel();
    if (!next || hop >= 1) throw new GitHubError("unavailable", "GitHub redirected somewhere else");
    url = next;
  }
}

function failureOf(res: Response, now: number): GitHubError {
  if (res.status === 403 || res.status === 429) {
    // Secondary limits send Retry-After; the hourly limit sends its reset time instead.
    const retryAfter = res.headers.get("retry-after");
    if (retryAfter !== null && Number.isFinite(Number(retryAfter))) {
      return new GitHubError("rate_limited", "GitHub asked us to slow down", Number(retryAfter) * 1000);
    }
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    if (res.headers.get("x-ratelimit-remaining") === "0" && Number.isFinite(reset) && reset > 0) {
      return new GitHubError("rate_limited", "GitHub's hourly limit is used up", Math.max(1000, reset * 1000 - now));
    }
    if (res.status === 429) return new GitHubError("rate_limited", "GitHub asked us to slow down");
  }
  return new GitHubError("unavailable", `GitHub answered ${res.status}`);
}

async function readCapped(res: Response, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) return { text: "", truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (size + value.byteLength > maxBytes) {
        chunks.push(value.subarray(0, maxBytes - size));
        size = maxBytes;
        truncated = true;
        await reader.cancel();
        break;
      }
      chunks.push(value);
      size += value.byteLength;
    }
  } catch {
    throw new GitHubError("unavailable", "GitHub's answer was cut off");
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(bytes), truncated };
}

export type GetOptions<T> = {
  accept: string;
  maxBytes: number;
  parse: (body: string, truncated: boolean) => T;
};

// null when GitHub says it doesn't exist (or, for search, can't search that account). Both are
// cached.
export async function cachedGet<T>(session: GitHubSession, path: string, options: GetOptions<T>): Promise<T | null> {
  const cached = cacheGet(path, Date.now());
  if (cached && isFresh(cached, Date.now())) return cached.value as T | null;

  const res = await call(session, path, options.accept, cached?.etag ?? null);
  if (res.status === 304 && cached) {
    await res.body?.cancel();
    cacheSet(path, { ...cached, at: Date.now() });
    return cached.value as T | null;
  }
  if ([404, 410, 422, 451].includes(res.status)) {
    await res.body?.cancel();
    cacheSet(path, { at: Date.now(), etag: null, value: null });
    return null;
  }
  if (!res.ok) {
    await res.body?.cancel();
    throw failureOf(res, Date.now());
  }
  const { text, truncated } = await readCapped(res, options.maxBytes);
  const value = options.parse(text, truncated);
  cacheSet(path, { at: Date.now(), etag: res.headers.get("etag"), value });
  return value;
}

export function jsonOf(body: string, truncated: boolean): unknown {
  if (truncated) throw new GitHubError("unavailable", "GitHub's answer was too large");
  try {
    return JSON.parse(body);
  } catch {
    throw new GitHubError("unavailable", "GitHub sent an unreadable answer");
  }
}
