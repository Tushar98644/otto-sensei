import { z } from "zod";
import { log } from "@/lib/log";

// Server-only: never import this from a client component.

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const stringWithDefault = (fallback: string) =>
  z.preprocess(emptyToUndefined, z.string().default(fallback));

type DodoEnvironment = "test" | "live";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: optionalString,
  VERCEL_PROJECT_PRODUCTION_URL: optionalString,
  OPENROUTER_API_KEY: optionalString,
  // OpenRouter slugs; each must support structured outputs and reasoning.
  AI_MODEL: stringWithDefault("z-ai/glm-5.3-flash"),
  AI_STRUCTURE_MODEL: stringWithDefault("z-ai/glm-5.3-flash"),
  NEXT_PUBLIC_SUPABASE_URL: optionalString,
  SUPABASE_URL: optionalString,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString,
  SUPABASE_PUBLISHABLE_KEY: optionalString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SECRET_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  DEV_AUTH: optionalString,
  AUTH_SECRET: optionalString,
  DEV_GITHUB_LOGIN: optionalString,
  DODO_API_KEY: optionalString,
  DODO_WEBHOOK_SECRET: optionalString,
  // Only an explicit "live" (or "live_mode", "production") takes real money; anything else is test mode.
  DODO_ENVIRONMENT: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .default("test")
      .transform((value): DodoEnvironment =>
        ["live", "live_mode", "production"].includes(value.trim().toLowerCase()) ? "live" : "test",
      ),
  ),
  DODO_PRO_MONTHLY_PRODUCT_ID: optionalString,
  DODO_PRO_YEARLY_PRODUCT_ID: optionalString,
  DODO_MAX_MONTHLY_PRODUCT_ID: optionalString,
  DODO_MAX_YEARLY_PRODUCT_ID: optionalString,
  DODO_PRO_TRIAL_PRODUCT_ID: optionalString,
  BILLING_SIGNING_SECRET: optionalString,
  GITHUB_TOKEN: optionalString,
  CRON_SECRET: optionalString,
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
  // Comma-separated Chrome extension ids allowed to call /api/extension/* (the Web Store id once published).
  OTTO_EXTENSION_IDS: optionalString,
  INBOUND_EMAIL_SECRET: optionalString,
  // "subaddress" (default): otto+handle@track.ottosensei.com. "domain": handle@INBOUND_DOMAIN.
  INBOUND_ADDRESS_STYLE: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .default("subaddress")
      .transform((value): "subaddress" | "domain" =>
        value.trim().toLowerCase() === "domain" ? "domain" : "subaddress",
      ),
  ),
  INBOUND_DOMAIN: optionalString,
});

export type Env = z.infer<typeof EnvSchema>;

// Parsed lazily so tests can set process.env before the first read.
let cached: Env | null = null;
let warnedLocalAppUrl = false;

export function env(): Env {
  if (!cached) cached = EnvSchema.parse(process.env);
  return cached;
}

export function resetEnvForTests() {
  cached = null;
  warnedLocalAppUrl = false;
}

export function isProduction() {
  return env().NODE_ENV === "production";
}

export function aiEnabled() {
  return Boolean(env().OPENROUTER_API_KEY);
}

export type SupabaseConfig = { url: string; publishableKey: string };

export function supabaseConfig(): SupabaseConfig | null {
  const e = env();
  const url = e.NEXT_PUBLIC_SUPABASE_URL ?? e.SUPABASE_URL;
  const publishableKey =
    e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    e.SUPABASE_PUBLISHABLE_KEY ??
    e.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    e.SUPABASE_ANON_KEY;
  return url && publishableKey ? { url, publishableKey } : null;
}

export function supabaseSecretKey(): string | undefined {
  const { SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY } = env();
  return SUPABASE_SECRET_KEY ?? SUPABASE_SERVICE_ROLE_KEY;
}

const LOCAL_APP_URL = "http://localhost:3000";

function origin(value: string): string {
  const trimmed = value.trim();
  const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return url.replace(/\/+$/, "");
}

export function appUrl(): string {
  const { NEXT_PUBLIC_APP_URL: configured, VERCEL_PROJECT_PRODUCTION_URL: vercelHost } = env();
  if (configured) return origin(configured);
  if (vercelHost) return origin(vercelHost);
  if (isProduction() && !warnedLocalAppUrl) {
    warnedLocalAppUrl = true;
    log.warn("env.app_url_localhost", {
      reason: "NEXT_PUBLIC_APP_URL and VERCEL_PROJECT_PRODUCTION_URL are not set",
    });
  }
  return LOCAL_APP_URL;
}
