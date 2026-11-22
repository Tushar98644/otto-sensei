// The connect page and the extension's bridge script talk through window.postMessage on this site only.
export const PAGE_SOURCE = "otto-sensei";
export const EXTENSION_SOURCE = "otto-for-chrome";

export type PageMessage =
  | { source: typeof PAGE_SOURCE; type: "hello" }
  | { source: typeof PAGE_SOURCE; type: "token"; token: string; expiresAt: number };

export type ExtensionMessage =
  | { source: typeof EXTENSION_SOURCE; type: "ready"; version: string; email: string | null }
  | { source: typeof EXTENSION_SOURCE; type: "connected"; email: string }
  | { source: typeof EXTENSION_SOURCE; type: "failed"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readPageMessage(data: unknown): PageMessage | null {
  if (!isRecord(data) || data.source !== PAGE_SOURCE) return null;
  if (data.type === "hello") return { source: PAGE_SOURCE, type: "hello" };
  if (
    data.type === "token" &&
    typeof data.token === "string" &&
    data.token.length <= 128 &&
    typeof data.expiresAt === "number"
  ) {
    return { source: PAGE_SOURCE, type: "token", token: data.token, expiresAt: data.expiresAt };
  }
  return null;
}

export function readExtensionMessage(data: unknown): ExtensionMessage | null {
  if (!isRecord(data) || data.source !== EXTENSION_SOURCE) return null;
  if (data.type === "ready" && typeof data.version === "string") {
    const email = typeof data.email === "string" ? data.email : null;
    return { source: EXTENSION_SOURCE, type: "ready", version: data.version, email };
  }
  if (data.type === "connected" && typeof data.email === "string") {
    return { source: EXTENSION_SOURCE, type: "connected", email: data.email };
  }
  if (data.type === "failed" && typeof data.message === "string") {
    return { source: EXTENSION_SOURCE, type: "failed", message: data.message.slice(0, 300) };
  }
  return null;
}
