import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// 3100; E2E_PORT moves it when another session already holds that port.
export const E2E_PORT = Number(process.env.E2E_PORT) || 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_DIST_DIR = ".next-e2e";

// Variables the app or its SDKs read that .env.example does not list.
const EXTRA_VARS = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_REF",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "DEV_GITHUB_LOGIN",
  "DODO_SETUP_API_KEY",
  "DODO_SETUP_APP_URL",
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DEV",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "VERCEL",
  "VERCEL_URL",
  "VERCEL_OIDC_TOKEN",
  "AI_GATEWAY_API_KEY",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_DEPLOYMENT_ID",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_ENV",
  "NEXT_PUBLIC_VERCEL_ENV",
  "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA",
];

// Names only, from the committed example file; the real .env files are never read.
function exampleVars(root: string): string[] {
  const file = path.join(root, ".env.example");
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .flatMap((line) => /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/.exec(line)?.[1] ?? []);
}

// next dev fills a variable from .env files only when it is unset, and the app treats "" as unset.
export function serverEnv(root: string, pgliteDir: string): Record<string, string | undefined> {
  const blanks = Object.fromEntries(
    [...exampleVars(root), ...EXTRA_VARS].map((name) => [name, ""]),
  );
  const env: Record<string, string | undefined> = {
    ...process.env,
    ...blanks,
    OTTO_PGLITE_DIR: pgliteDir,
    OTTO_NEXT_DIST_DIR: E2E_DIST_DIR,
    NEXT_PUBLIC_APP_URL: E2E_BASE_URL,
    NEXT_TELEMETRY_DISABLED: "1",
  };
  delete env.NODE_ENV;
  return env;
}
