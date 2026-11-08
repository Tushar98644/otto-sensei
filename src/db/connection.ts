import type postgres from "postgres";

// Server-only, no imports from the app so scripts/migrate.ts can use it under plain bun.
// Which URL to connect to, and how, for both ways of wiring Supabase into Vercel:
// - a project made at supabase.com: DATABASE_URL (transaction pooler, port 6543) and
//   DIRECT_DATABASE_URL (direct or session pooler, port 5432), set by hand;
// - the Vercel Marketplace integration: POSTGRES_URL (pooled) and POSTGRES_URL_NON_POOLING.

type EnvLike = Record<string, string | undefined>;

function first(env: EnvLike, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export const POOLED_URL_VARS = ["DATABASE_URL", "POSTGRES_URL"] as const;
// The migration runner holds a session-level lock and runs DDL, so it prefers a connection that
// isn't shared per transaction, and falls back to the pooled one.
export const DIRECT_URL_VARS = [
  "DIRECT_DATABASE_URL",
  "POSTGRES_URL_NON_POOLING",
  ...POOLED_URL_VARS,
] as const;

export function pooledDatabaseUrl(env: EnvLike = process.env): string | undefined {
  return first(env, POOLED_URL_VARS);
}

export function directDatabaseUrl(env: EnvLike = process.env): string | undefined {
  return first(env, DIRECT_URL_VARS);
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export type ConnectionTarget = { url: string; ssl: "require" | false };

/**
 * postgres.js forwards every unknown query parameter to the server as a startup setting, and the
 * Vercel integration's URLs carry extras (e.g. `supa=base-pooler.x`) that Postgres would reject.
 * So only sslmode is read and the query is dropped. TLS is on unless the URL says
 * sslmode=disable or points at this machine. "require" encrypts without checking the CA, which is
 * what Supabase's pooler needs (its certificate isn't from a public CA).
 */
export function connectionTarget(rawUrl: string): ConnectionTarget {
  const url = new URL(rawUrl);
  const sslmode = url.searchParams.get("sslmode");
  url.search = "";
  const ssl = sslmode
    ? sslmode === "disable"
      ? false
      : "require"
    : LOCAL_HOSTS.has(url.hostname)
      ? false
      : "require";
  return { url: url.toString(), ssl };
}

/**
 * Options for the app's pool. prepare: false because Supabase's transaction pooler (port 6543)
 * hands each transaction to any server connection, so named prepared statements would go missing.
 * A small pool per instance: Fluid compute runs many requests per instance, and the pooler, not
 * this client, is what multiplexes them onto Postgres.
 */
export function appPoolOptions(target: ConnectionTarget): postgres.Options<Record<string, never>> {
  return {
    ssl: target.ssl,
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: { application_name: "otto-resume" },
  };
}
