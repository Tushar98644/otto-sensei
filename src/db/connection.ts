import type postgres from "postgres";

// No app imports: scripts/migrate.ts runs this under plain bun.

type EnvLike = Record<string, string | undefined>;

function first(env: EnvLike, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export const POOLED_URL_VARS = ["DATABASE_URL", "POSTGRES_URL"] as const;
// Migrations take a session-level lock, so prefer a connection not pooled per transaction.
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

// postgres.js sends URL params as startup settings Postgres may reject, so only sslmode stays.
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

// prepare: false: the transaction pooler may switch server connections between transactions.
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
