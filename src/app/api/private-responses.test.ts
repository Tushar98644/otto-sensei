import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueExtensionToken } from "@/lib/extension/tokens";
import { cookieJar, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";

vi.mock("next/headers", async () => ({
  ...(await import("@/lib/auth/test-helpers")).nextHeadersMock,
  headers: async () => new Headers({ "user-agent": "vitest" }),
}));

type Handler = (req: Request, context: { params: Promise<Record<string, string>> }) => unknown;
type RouteModule = { GET?: Handler };

// Answers that are the same for everyone, or that hold no account's data.
const PUBLIC = new Set([
  "./health/route.ts",
  "./jobs/occupations/route.ts",
  "./jobs/cities/route.ts",
  "./auth/expired/route.ts",
  "./billing/return/route.ts",
  "./notifications/unsubscribe/route.ts",
]);

const modules = import.meta.glob<RouteModule>("./**/route.ts");
const ID = "6b0f8d4e-6f2a-4c55-9f3e-2b7a1c9d0e11";

// Every dynamic segment gets a well-formed value that names nothing, so each route answers for real.
const params = new Proxy({} as Record<string, string>, {
  get: (_target, key) => (key === "then" ? undefined : key === "month" ? "2026-11" : ID),
});

function requestFor(file: string, token: string | null): Request {
  const path = file
    .slice(1)
    .replace(/\/route\.ts$/, "")
    .replace(/\[(\w+)\]/g, ID);
  const headers = new Headers({ "user-agent": "vitest" });
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request(`http://localhost/api${path}?id=${ID}`, { headers });
}

async function cacheControlOf(file: string, token: string | null): Promise<string> {
  const route = await modules[file]!();
  const res = (await route.GET!(requestFor(file, token), {
    params: Promise.resolve(params),
  })) as Response;
  return res.headers.get("cache-control") ?? "";
}

const PRIVATE = /\bno-store\b|\bprivate\b/;

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe("GET routes that answer with an account's data", () => {
  const files = Object.keys(modules).filter((file) => !PUBLIC.has(file));

  it.each(files)("%s tells every cache not to keep it", async (file) => {
    const route = await modules[file]!();
    if (!route.GET) return;
    expect(await cacheControlOf(file, null)).toMatch(PRIVATE);
    const user = await signInAs("ada@example.com");
    await setPlan(user, "pro");
    const issued = await issueExtensionToken(user.id);
    expect(await cacheControlOf(file, issued?.token ?? null)).toMatch(PRIVATE);
  });
});
