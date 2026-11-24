import { describe, expect, it } from "vitest";
import {
  appPoolOptions,
  connectionTarget,
  directDatabaseUrl,
  isTransactionPooler,
  pooledDatabaseUrl,
} from "./connection";

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
    expect(
      pooledDatabaseUrl({ DIRECT_DATABASE_URL: DIRECT, POSTGRES_URL_NON_POOLING: DIRECT }),
    ).toBeUndefined();
  });
});

describe("directDatabaseUrl", () => {
  it("prefers the direct connections, then falls back to the pooled ones", () => {
    expect(
      directDatabaseUrl({
        DIRECT_DATABASE_URL: DIRECT,
        POSTGRES_URL_NON_POOLING: "b",
        DATABASE_URL: POOLED,
      }),
    ).toBe(DIRECT);
    expect(directDatabaseUrl({ POSTGRES_URL_NON_POOLING: DIRECT, DATABASE_URL: POOLED })).toBe(
      DIRECT,
    );
    expect(directDatabaseUrl({ DATABASE_URL: POOLED })).toBe(POOLED);
    expect(directDatabaseUrl({ POSTGRES_URL: POOLED })).toBe(POOLED);
  });
});

describe("isTransactionPooler", () => {
  it("knows Supabase's transaction pooler by its port, not the session pooler or direct host", () => {
    expect(isTransactionPooler(POOLED)).toBe(true);
    expect(isTransactionPooler(POOLED.replace(":6543", ":5432"))).toBe(false);
    expect(isTransactionPooler(DIRECT)).toBe(false);
    expect(isTransactionPooler("postgres://me@localhost/otto")).toBe(false);
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
    expect(appPoolOptions(connectionTarget(POOLED))).toMatchObject({
      prepare: false,
      ssl: "require",
    });
  });

  it("keeps the app's 5 connections unless a script asks for its own number", () => {
    expect(appPoolOptions(connectionTarget(POOLED)).max).toBe(5);
    expect(appPoolOptions(connectionTarget(POOLED), 17)).toMatchObject({ max: 17, prepare: false });
  });
});
