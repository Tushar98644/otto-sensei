import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { rateLimits } from "@/db/schema";
import { resetDb } from "@/lib/auth/test-helpers";
import { resetBurstLimitsForTests } from "@/lib/burst-limit";
import { publicJobId } from "@/lib/job-feed/codes";
import { saveJobs, syncBoards } from "@/lib/job-feed/store";
import { storedJobIds } from "@/lib/job-feed/test-fixtures";
import { MINUTE_MS } from "@/lib/time";
import { DELETE, GET, OPTIONS, POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
// unstable_cache needs Next's server: this keeps what it keeps, every answer and never a throw.
vi.mock("@/lib/job-feed/public-cache", () => ({
  cachedForDay: <Args extends unknown[], Result>(
    _name: string,
    load: (...args: Args) => Promise<Result>,
  ) => {
    const kept = new Map<string, Result>();
    return async (...args: Args) => {
      const key = JSON.stringify(args);
      if (kept.has(key)) return kept.get(key) as Result;
      const value = await load(...args);
      kept.set(key, value);
      return value;
    };
  },
}));

const NOW = Date.UTC(2026, 10, 21, 12, 30, 0);
const DAY = 24 * 60 * 60 * 1_000;
const LEGACY = "2025-11-25";
const MODERN = "2026-07-28";
const IP = "203.0.113.7";
const POST_TEXT = "Build services in Go and PostgreSQL.";
const MODERN_META = {
  "io.modelcontextprotocol/protocolVersion": MODERN,
  "io.modelcontextprotocol/clientInfo": { name: "vitest", version: "1" },
  "io.modelcontextprotocol/clientCapabilities": {},
};

type RpcReply = {
  id?: number | string | null;
  result?: Record<string, unknown> & {
    tools?: { name: string; title?: string; annotations?: Record<string, unknown> }[];
    structuredContent?: Record<string, unknown>;
    content?: { type: string; text: string }[];
    isError?: boolean;
  };
  error?: { code: number; message: string };
};

let nextId = 1;

function rpc(
  method: string,
  params: Record<string, unknown> | undefined,
  headers: Record<string, string> = {},
  ip = IP,
): Request {
  const notification = method.startsWith("notifications/");
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "x-forwarded-for": ip,
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      ...(notification ? {} : { id: nextId++ }),
      method,
      ...(params ? { params } : {}),
    }),
  });
}

async function reply(res: Response): Promise<RpcReply> {
  const text = await res.text();
  if (!(res.headers.get("content-type") ?? "").includes("text/event-stream"))
    return JSON.parse(text) as RpcReply;
  const data = text
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice(6));
  return JSON.parse(data.at(-1)!) as RpcReply;
}

const legacy = (method: string, params?: Record<string, unknown>, ip = IP) =>
  POST(rpc(method, params, { "mcp-protocol-version": LEGACY }, ip));

async function legacyCall(name: string, args: Record<string, unknown>, ip = IP) {
  const res = await legacy("tools/call", { name, arguments: args }, ip);
  expect(res.status).toBe(200);
  return (await reply(res)).result!;
}

async function seedJobs(): Promise<string> {
  const db = await getDb();
  await syncBoards(db, [{ ats: "greenhouse", token: "gitlab", company: "GitLab" }]);
  await saveJobs(
    db,
    { source: "greenhouse", board: "gitlab" },
    [
      {
        externalId: "8638232002",
        company: "GitLab",
        title: "Senior Backend Engineer",
        location: "Remote, United States",
        remote: true,
        employmentType: "full_time",
        postedAt: NOW - DAY,
        validThrough: null,
        url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
        text: POST_TEXT,
      },
    ],
    NOW,
    { snapshot: true },
  );
  const [row] = await storedJobIds(db);
  return row!.id;
}

describe("/api/mcp", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    await resetDb();
    resetBurstLimitsForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("serves a 2025-era client: initialize, initialized, tools/list and both tools", async () => {
    const id = await seedJobs();
    const init = await POST(
      rpc("initialize", {
        protocolVersion: LEGACY,
        capabilities: {},
        clientInfo: { name: "vitest", version: "1" },
      }),
    );
    expect(init.status).toBe(200);
    expect(init.headers.get("access-control-allow-origin")).toBe("*");
    expect(init.headers.get("mcp-session-id")).toBeNull();
    const hello = (await reply(init)).result!;
    expect(hello).toMatchObject({
      protocolVersion: LEGACY,
      serverInfo: { name: "otto-jobs", title: "Otto Jobs" },
      capabilities: { tools: {} },
    });
    expect(hello.instructions).toMatch(/search.*fetch/s);

    expect((await legacy("notifications/initialized")).status).toBe(202);

    const listed = await reply(await legacy("tools/list"));
    const tools = listed.result!.tools!;
    expect(tools.map((tool) => tool.name)).toEqual(["search", "fetch"]);
    for (const tool of tools) {
      expect(tool.title).toBeTruthy();
      expect(tool.annotations).toMatchObject({
        title: tool.title,
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      });
    }

    const found = await legacyCall("search", { query: "backend engineer jobs remote" });
    const results = [
      {
        id,
        title: "Senior Backend Engineer at GitLab (Remote, United States), via Greenhouse",
        url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
      },
    ];
    expect(found.isError).toBeFalsy();
    expect(found.structuredContent).toEqual({ results });
    expect(JSON.parse(found.content![0]!.text)).toEqual({ results });
    expect(found.content![1]!.text).toMatch(/1 of 1 matching open jobs/);

    const job = await legacyCall("fetch", { id });
    const details = job.structuredContent as { text: string; url: string; metadata: object };
    expect(details).toMatchObject({
      id,
      title: "Senior Backend Engineer at GitLab (Remote, United States), via Greenhouse",
      url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
      metadata: {
        company: "GitLab",
        remote: true,
        employmentType: "Full-time",
        source: "via Greenhouse",
      },
    });
    expect(details.text).toContain(
      "Apply: https://job-boards.greenhouse.io/gitlab/jobs/8638232002 (via Greenhouse)",
    );
    expect(details.text).toMatch(
      /Tailor your resume to this job on Otto Sensei: https?:\/\/\S+\/login\?next=%2Fdashboard%2Fjobs%3Ftailor%3D[\w-]+&utm_source=mcp&utm_medium=connector&utm_campaign=otto_jobs/,
    );
    expect(JSON.stringify(job)).not.toContain(POST_TEXT);
  });

  it("serves a 2026-07-28 client without a handshake", async () => {
    await seedJobs();
    const headers = { "mcp-protocol-version": MODERN, "mcp-method": "tools/list" };
    const res = await POST(rpc("tools/list", { _meta: MODERN_META }, headers));
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const tools = (await reply(res)).result!.tools!;
    expect(tools.map((tool) => tool.name)).toEqual(["search", "fetch"]);
    expect(tools[0]!.annotations).toMatchObject({ readOnlyHint: true, openWorldHint: false });

    const call = await POST(
      rpc(
        "tools/call",
        { name: "search", arguments: { query: "gitlab" }, _meta: MODERN_META },
        { "mcp-protocol-version": MODERN, "mcp-method": "tools/call", "mcp-name": "search" },
      ),
    );
    expect(call.status).toBe(200);
    const results = (await reply(call)).result!.structuredContent!.results as { title: string }[];
    expect(results.map((result) => result.title)).toEqual([
      "Senior Backend Engineer at GitLab (Remote, United States), via Greenhouse",
    ]);
  });

  it("answers a bad or gone id and an empty search with what to do next", async () => {
    await seedJobs();
    const bad = await legacyCall("fetch", { id: "job-42" });
    expect(bad.isError).toBe(true);
    expect(bad.content![0]!.text).toMatch(/not an Otto job id.*search/);
    const gone = await legacyCall("fetch", { id: publicJobId(987_654) });
    expect(gone.isError).toBe(true);
    expect(gone.content![0]!.text).toMatch(/no longer open.*Run search again/);
    const none = await legacyCall("search", { query: "lighthouse keeper" });
    expect(none.structuredContent).toEqual({ results: [] });
    expect(none.content![1]!.text).toMatch(/^No open jobs matched those words\. Try fewer words/);
    const empty = await legacyCall("search", { query: "" });
    expect(empty.isError).toBe(true);
  });

  it("limits tool calls per network, not the handshake", async () => {
    const ip = "203.0.113.9";
    const db = await getDb();
    await db.insert(rateLimits).values({
      key: `mcp:ip:${ip}`,
      windowStart: Math.floor(NOW / MINUTE_MS) * MINUTE_MS,
      count: 60,
    });
    expect((await legacy("tools/list", undefined, ip)).status).toBe(200);
    const limited = await legacy("tools/call", { name: "search", arguments: { query: "x" } }, ip);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
    expect(limited.headers.get("access-control-allow-origin")).toBe("*");
    const body = (await limited.json()) as RpcReply;
    expect(body).toMatchObject({ jsonrpc: "2.0", error: { code: -32000 } });
    expect(typeof body.id).toBe("number");
    expect((await legacyCall("search", { query: "x" })).isError).toBeFalsy();
  });

  it("refuses batches and bodies it can't parse, so neither skips the tool-call limit", async () => {
    await seedJobs();
    const limitedIp = "203.0.113.11";
    const db = await getDb();
    await db.insert(rateLimits).values({
      key: `mcp:ip:${limitedIp}`,
      windowStart: Math.floor(NOW / MINUTE_MS) * MINUTE_MS,
      count: 60,
    });
    const call = (id: number) => ({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name: "search", arguments: { query: "engineer" } },
    });
    const send = (body: BodyInit, ip = limitedIp) =>
      POST(
        new Request("http://localhost/api/mcp", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
            "mcp-protocol-version": LEGACY,
            "x-forwarded-for": ip,
          },
          body,
        }),
      );
    const batch = await send(JSON.stringify(Array.from({ length: 70 }, (_, i) => call(i + 1))));
    expect(batch.status).toBe(400);
    expect(((await batch.json()) as RpcReply).error?.code).toBe(-32600);
    const broken = await send(JSON.stringify(call(1)).slice(0, -1));
    expect(broken.status).toBe(400);
    expect(((await broken.json()) as RpcReply).error?.code).toBe(-32700);
    // Runtimes strip a doubled BOM differently; either way the SDK runs only what the limiter saw.
    const bom = [0xef, 0xbb, 0xbf];
    const doubleBom = new Uint8Array([
      ...bom,
      ...bom,
      ...new TextEncoder().encode(JSON.stringify(call(1))),
    ]);
    expect([400, 429]).toContain((await send(doubleBom)).status);
    expect((await legacyCall("search", { query: "engineer" })).isError).toBeFalsy();
  });

  it("answers GET and DELETE with 405 and a preflight with CORS headers", async () => {
    for (const [method, handle] of [
      ["GET", GET],
      ["DELETE", DELETE],
    ] as const) {
      const res = await handle(new Request("http://localhost/api/mcp", { method }));
      expect(res.status).toBe(405);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
    const preflight = OPTIONS();
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
    expect(preflight.headers.get("access-control-allow-methods")).toContain("POST");
    for (const header of [
      "mcp-protocol-version",
      "mcp-session-id",
      "last-event-id",
      "authorization",
    ])
      expect(preflight.headers.get("access-control-allow-headers")!.toLowerCase()).toContain(
        header,
      );
    expect(preflight.headers.get("access-control-expose-headers")).toContain(
      "MCP-Protocol-Version",
    );
  });
});
