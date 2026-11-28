import { createMcpHandler } from "@modelcontextprotocol/server";
import { ipBucket } from "@/lib/api/limits";
import { burstAllowed } from "@/lib/burst-limit";
import { clientIp } from "@/lib/http";
import { log } from "@/lib/log";
import { createOttoJobsServer } from "@/lib/mcp/otto-jobs";
import { rateLimit, retryAfterHeader } from "@/lib/rate-limit";
import { MINUTE_MS } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// A public, read-only endpoint with no cookies or credentials, so any page may call it.
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Authorization, MCP-Protocol-Version, Mcp-Session-Id, Mcp-Method, Mcp-Name, Last-Event-ID",
  "Access-Control-Expose-Headers": "MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

const MCP_LIMITS = {
  // Tool calls per network a minute; Claude and ChatGPT share a few egress addresses, so it stays generous.
  callsPerMinute: 60,
  // Every request, counted in memory first so a flood never reaches the database.
  burstPerMinute: 240,
  maxBodyBytes: 64 * 1024,
} as const;

const KNOWN_ORIGINS =
  /^https:\/\/(?:[\w-]+\.)*(?:ottosensei\.com|claude\.ai|claude\.com|anthropic\.com|chatgpt\.com|openai\.com)$|^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

const handler = createMcpHandler(createOttoJobsServer, {
  legacy: "stateless",
  onerror: (error) => log.info("mcp.rejected", { reason: error.message.slice(0, 200) }),
});

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [name, value] of Object.entries(CORS)) headers.set(name, value);
  if (!headers.has("cache-control")) headers.set("Cache-Control", "no-store");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function rpcError(
  id: unknown,
  code: number,
  message: string,
  status: number,
  headers: Record<string, string> = {},
): Response {
  const replyId = typeof id === "string" || typeof id === "number" ? id : null;
  return withCors(
    Response.json(
      { jsonrpc: "2.0", id: replyId, error: { code, message } },
      { status, headers: { "Cache-Control": "no-store", ...headers } },
    ),
  );
}

function parseBody(body: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(body) };
  } catch {
    return { ok: false };
  }
}

// Unknown origins pass: strict checks reject real hosts, and nothing here acts for a signed-in person.
function noteOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (origin && !KNOWN_ORIGINS.test(origin))
    log.info("mcp.unknown_origin", { origin: origin.slice(0, 100) });
}

// The key holds the IP address, so only the error goes to the log, and a broken limiter never blocks a call.
async function callAllowed(bucket: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
  try {
    return await rateLimit(`mcp:ip:${bucket}`, MCP_LIMITS.callsPerMinute, MINUTE_MS);
  } catch (error) {
    log.warn("mcp.rate_limit_unavailable", {}, error);
    return { allowed: true, retryAfterMs: 0 };
  }
}

const SLOW_DOWN = "Too many requests from this network. Try again in a minute.";

export async function POST(req: Request): Promise<Response> {
  noteOrigin(req);
  const bucket = ipBucket(clientIp(req));
  if (!burstAllowed(`mcp:${bucket}`, MCP_LIMITS.burstPerMinute, MINUTE_MS))
    return rpcError(null, -32000, SLOW_DOWN, 429, retryAfterHeader(MINUTE_MS));
  if (Number(req.headers.get("content-length") ?? "0") > MCP_LIMITS.maxBodyBytes)
    return rpcError(null, -32600, "Request is too large.", 413);
  try {
    const body = await req.text();
    if (Buffer.byteLength(body) > MCP_LIMITS.maxBodyBytes)
      return rpcError(null, -32600, "Request is too large.", 413);
    // The SDK gets this same parsed value, so the limit below sees exactly the message that runs.
    const parsed = parseBody(body);
    if (!parsed.ok)
      return rpcError(null, -32700, "Parse error: the request body is not valid JSON.", 400);
    // Batches were dropped from MCP in 2025-06-18, and one would carry many tool calls past the limit.
    if (Array.isArray(parsed.value))
      return rpcError(
        null,
        -32600,
        "Batch requests are not supported. Send one JSON-RPC message per request.",
        400,
      );
    const message = (parsed.value ?? {}) as { id?: unknown; method?: unknown };
    if (message.method === "tools/call") {
      const limit = await callAllowed(bucket);
      if (!limit.allowed)
        return rpcError(message.id, -32000, SLOW_DOWN, 429, retryAfterHeader(limit.retryAfterMs));
    }
    const headers = new Headers(req.headers);
    headers.delete("content-length");
    const forwarded = new Request(req.url, { method: "POST", headers, body });
    return withCors(await handler.fetch(forwarded, { parsedBody: parsed.value }));
  } catch (error) {
    log.error("mcp.failed", error);
    return rpcError(null, -32603, "Otto Jobs couldn't answer. Try again in a minute.", 500);
  }
}

// Stateless serving has no stream or session to open or end, so the handler answers 405.
export async function GET(req: Request): Promise<Response> {
  return withCors(await handler.fetch(req));
}

export async function DELETE(req: Request): Promise<Response> {
  return withCors(await handler.fetch(req));
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: { ...CORS, "Cache-Control": "no-store" } });
}
