import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { request } from "@playwright/test";
import type { RequestCodeResponse } from "@/lib/api/types";
import { E2E_BASE_URL, E2E_DIST_DIR, E2E_PORT } from "./env";

type DevServerLock = { pid?: number; port?: number };

// Pages and API routes the specs use; GETs render them, and writes with an empty body only compile the route.
const WARM_CALLS: ReadonlyArray<readonly ["get" | "post" | "put" | "patch", string]> = [
  ...[
    "/",
    "/login",
    "/pricing",
    "/account",
    "/studio",
    "/dashboard",
    "/dashboard/resumes",
    "/dashboard/jobs",
    "/dashboard/applications",
    "/dashboard/letters",
    "/dashboard/portfolio",
    "/dashboard/account",
    "/api/me",
    "/api/resumes",
    "/api/portfolio",
  ].map((url) => ["get", url] as const),
  ...[
    "/api/fix",
    "/api/tailor",
    "/api/check",
    "/api/billing/checkout",
    "/api/applications",
    "/api/jobs/matches",
    "/api/letter",
  ].map((url) => ["post", url] as const),
  ["put", "/api/resumes/00000000-0000-4000-8000-000000000000"],
  ["patch", "/api/applications/00000000-0000-4000-8000-000000000000"],
  ["put", "/api/jobs/saved/00000000-0000-4000-8000-000000000000"],
  ["put", "/api/setup"],
];
const COMPILE_TIMEOUT = 180_000;
const AT_ONCE = 3;

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function assertOwnServer() {
  const file = path.join(process.cwd(), E2E_DIST_DIR, "dev", "lock");
  const lock: DevServerLock | null = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : null;
  if (lock?.port === E2E_PORT && typeof lock.pid === "number" && alive(lock.pid)) return;
  throw new Error(
    `Port ${E2E_PORT} is answering, but not from the e2e server (bun e2e/server.ts). Stop whatever is on port ${E2E_PORT}, or set E2E_PORT to a free port, and run again.`,
  );
}

// next dev compiles each route on its first visit; doing it once here keeps that out of every test's timeouts.
async function warmRoutes() {
  const api = await request.newContext({
    baseURL: E2E_BASE_URL,
    extraHTTPHeaders: { "x-forwarded-for": "10.255.255.254" },
    timeout: COMPILE_TIMEOUT,
  });
  try {
    const email = `e2e-warmup-${Date.now().toString(36)}@example.com`;
    const sent = (await (
      await api.post("/api/auth/request-code", { data: { email } })
    ).json()) as RequestCodeResponse;
    await api.post("/api/auth/verify", { data: { email, code: sent.devCode } });
    const calls = [...WARM_CALLS];
    while (calls.length) {
      await Promise.all(
        calls
          .splice(0, AT_ONCE)
          .map(([method, url]) =>
            method === "get" ? api.get(url, { maxRedirects: 0 }) : api[method](url, { data: {} }),
          ),
      );
    }
  } finally {
    await api.dispose();
  }
}

// A server Playwright reuses on port 3100 must be ours: any other next dev may hold real keys and the owner's data.
export default async function globalSetup() {
  assertOwnServer();
  await warmRoutes();
}
