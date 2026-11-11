import type { LookupAddress } from "node:dns";
import type { PinnedRequest, PinnedResponse } from "./transport";

// Test-only. A fake internet for job reads, every request recorded. Wire it up with:
//   vi.mock("node:dns", async (importOriginal) => (await import("@/lib/jobs/test-network")).dnsMock(await importOriginal()));
//   vi.mock("@/lib/jobs/transport", async () => (await import("@/lib/jobs/test-network")).transportMock);

export type FakeReply = {
  status?: number;
  headers?: Record<string, string>;
  // A string is sent in one chunk; a list of chunks is sent as is.
  body?: string | Uint8Array[];
  // Sends headers, then never finishes the body.
  stallBody?: boolean;
  // Never answers at all, until the request is aborted.
  stallConnect?: boolean;
};

type Route = FakeReply | ((request: PinnedRequest) => FakeReply);

const dns = new Map<string, LookupAddress[]>();
const routes = new Map<string, Route>();
const requests: PinnedRequest[] = [];

export const fakeNet = {
  requests,
  // Each host resolves to the given addresses; unknown hosts fail like a real ENOTFOUND.
  resolve(host: string, ...addresses: string[]) {
    dns.set(
      host,
      addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })),
    );
  },
  route(url: string, reply: Route) {
    routes.set(url, reply);
  },
  html(url: string, html: string, status = 200) {
    routes.set(url, {
      status,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: html,
    });
  },
  json(url: string, value: unknown, status = 200) {
    routes.set(url, {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(value),
    });
  },
  redirect(url: string, location: string, status = 302) {
    routes.set(url, { status, headers: { location } });
  },
  urls(): string[] {
    return requests.map((request) => request.url.toString());
  },
  reset() {
    dns.clear();
    routes.clear();
    requests.length = 0;
  },
};

async function fakeLookup(hostname: string): Promise<LookupAddress[]> {
  const answers = dns.get(hostname);
  if (!answers)
    throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), { code: "ENOTFOUND" });
  return answers;
}

function abortError(): Error {
  return Object.assign(new Error("The operation was aborted"), {
    name: "AbortError",
    code: "ABORT_ERR",
  });
}

async function* chunks(reply: FakeReply, signal: AbortSignal): AsyncGenerator<Uint8Array> {
  if (reply.stallBody) {
    await new Promise((_, reject) => signal.addEventListener("abort", () => reject(abortError())));
  }
  const body = reply.body ?? "";
  for (const chunk of typeof body === "string" ? [new TextEncoder().encode(body)] : body)
    yield chunk;
}

async function fakeSend(request: PinnedRequest): Promise<PinnedResponse> {
  requests.push(request);
  const route = routes.get(request.url.toString());
  const reply: FakeReply =
    typeof route === "function" ? route(request) : (route ?? { status: 404 });
  if (reply.stallConnect) {
    return new Promise((_, reject) =>
      request.signal.addEventListener("abort", () => reject(abortError())),
    );
  }
  const headers = Object.fromEntries(
    Object.entries(reply.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    status: reply.status ?? 200,
    header: (name) => headers[name.toLowerCase()] ?? null,
    body: chunks(reply, request.signal),
    discard: () => undefined,
  };
}

export function dnsMock<T extends { promises: object }>(actual: T): T {
  return { ...actual, promises: { ...actual.promises, lookup: fakeLookup } };
}

export const transportMock = { sendPinned: fakeSend };
