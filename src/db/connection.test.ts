import { describe, expect, it } from "vitest";
import { appPoolOptions, connectionTarget, directDatabaseUrl, pooledDatabaseUrl } from "./connection";

const POOLED = "postgresql://postgres.abc:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
const DIRECT = "postgresql://postgres:pw@db.abc.supabase.co:5432/postgres";

describe("pooledDatabaseUrl", () => {
  it("prefers DATABASE_URL, then the Vercel integration's POSTGRES_URL", () => {
    expect(pooledDatabaseUrl({ DATABASE_URL: POOLED, POSTGRES_URL: "other" })).toBe(POOLED);
    expect(pooledDatabaseUrl({ POSTGRES_URL: POOLED })).toBe(POOLED);
    expect(pooledDatabaseUrl({ DATABASE_URL: "  ", POSTGRES_URL: POOLED })).toBe(POOLED);
    expect(pooledDatabaseUrl({})).toBeUndefined();
  });

  it("never picks a direct-only variable", () => {
    expect(pooledDatabaseUrl({ DIRECT_DATABASE_URL: DIRECT, POSTGRES_URL_NON_POOLING: DIRECT })).toBeUndefined();
  });
});

describe("directDatabaseUrl", () => {
  it("prefers the direct connections, then falls back to the pooled ones", () => {
    expect(directDatabaseUrl({ DIRECT_DATABASE_URL: DIRECT, POSTGRES_URL_NON_POOLING: "b", DATABASE_URL: POOLED })).toBe(DIRECT);
    expect(directDatabaseUrl({ POSTGRES_URL_NON_POOLING: DIRECT, DATABASE_URL: POOLED })).toBe(DIRECT);
    expect(directDatabaseUrl({ DATABASE_URL: POOLED })).toBe(POOLED);
    expect(directDatabaseUrl({ POSTGRES_URL: POOLED })).toBe(POOLED);
  });
});

describe("connectionTarget", () => {
  it("drops query parameters Postgres would reject as settings, keeping TLS on", () => {
    const target = connectionTarget(`${POOLED}?sslmode=require&supa=base-pooler.x`);
    expect(target).toEqual({ url: POOLED, ssl: "require" });
  });

  it("uses TLS for remote hosts even when the URL doesn't ask", () => {
    expect(connectionTarget(DIRECT).ssl).toBe("require");
  });

  it("skips TLS for this machine or when the URL turns it off", () => {
    expect(connectionTarget("postgres://me@localhost:5432/otto").ssl).toBe(false);
    expect(connectionTarget("postgres://me@127.0.0.1/otto").ssl).toBe(false);
    expect(connectionTarget(`${DIRECT}?sslmode=disable`).ssl).toBe(false);
  });
});

describe("appPoolOptions", () => {
  it("never prepares statements, which the transaction pooler can't keep", () => {
    expect(appPoolOptions(connectionTarget(POOLED))).toMatchObject({ prepare: false, ssl: "require" });
  });
});
