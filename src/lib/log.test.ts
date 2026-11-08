import { DrizzleQueryError } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { log } from "./log";

const EMAIL = "alice@example.com";
const IP = "203.0.113.7";

function queryError(): DrizzleQueryError {
  return new DrizzleQueryError(
    'insert into "rate_limits" ("key", "window_start", "count") values (?, ?, ?)',
    [`code:email:${EMAIL}`, 1_700_000_000_000, 1, `code:ip:${IP}`],
    Object.assign(new Error("SQLITE_BUSY: database is locked"), { name: "LibsqlError" }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("log", () => {
  it.each(["development", "production"])("keeps query parameters out of database errors (%s)", (mode) => {
    vi.stubEnv("NODE_ENV", mode);
    const sinks = (["warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );

    log.error("auth.request_code_failed", queryError());
    log.warn("import.rate_limit_unavailable", {}, queryError());

    const output = JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));
    expect(output).toContain("SQLITE_BUSY: database is locked");
    expect(output).toContain("LibsqlError");
    expect(output).not.toContain(EMAIL);
    expect(output).not.toContain(IP);
  });

  it("still names a database error that carries no cause", () => {
    const sink = vi.spyOn(console, "error").mockImplementation(() => undefined);
    log.error("billing.webhook_failed", new DrizzleQueryError("select 1", [EMAIL]));

    const output = JSON.stringify(sink.mock.calls);
    expect(output).toContain("Database query failed");
    expect(output).not.toContain(EMAIL);
  });

  it("logs other errors as they are", () => {
    const sink = vi.spyOn(console, "error").mockImplementation(() => undefined);
    log.error("account.delete_failed", new TypeError("boom"));
    expect(JSON.stringify(sink.mock.calls)).toContain("boom");
  });
});
