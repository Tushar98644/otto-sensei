import { z } from "zod";
import { log } from "@/lib/log";

// Server-only. Never import this from a client component.

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const stringWithDefault = (fallback: string) =>
  z.preprocess(emptyToUndefined, z.string().default(fallback));

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: optionalString,
  // Vercel system variable, set on every deployment (preview too): the production host, no scheme.
  VERCEL_PROJECT_PRODUCTION_URL: optionalString,
  OPENROUTER_API_KEY: optionalString,
  // OpenRouter slugs; each must support structured outputs and reasoning. Separate so import
  // structuring (copy-only) can use a cheaper model.
  AI_MODEL: stringWithDefault("z-ai/glm-5.3-flash"),
  AI_STRUCTURE_MODEL: stringWithDefault("z-ai/glm-5.3-flash"),
  // Each value has two names: a supabase.com project's and the Vercel integration's.
  NEXT_PUBLIC_SUPABASE_URL: optionalString,
  SUPABASE_URL: optionalString,
  // The publishable key (sb_publishable_...) replaces the legacy anon JWT; either works.
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString,
  SUPABASE_PUBLISHABLE_KEY: optionalString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  SUPABASE_ANON_KEY: optionalString,
  // Server-only admin key (sb_secret_... or the legacy service_role JWT), for deleting accounts.
  SUPABASE_SECRET_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  // Dev only: "supabase" signs in through Supabase instead of on-screen codes. Free text on
  // purpose: a typo must not stop the app from starting.
  DEV_AUTH: optionalString,
  // Development only: signs dev-mode session cookies. Falls back to a fixed dev secret.
  AUTH_SECRET: optionalString,
  // Dev only: every dev account counts as connected to this GitHub login (no Supabase to link one).
  DEV_GITHUB_LOGIN: optionalString,
  // Creem keys belong to one environment: test keys only work on the test API, live keys on live.
  CREEM_API_KEY: optionalString,
  CREEM_WEBHOOK_SECRET: optionalString,
  // Anything but "false" or "0" uses Creem's test API (no real charges), so a missing value can't
  // take real money by mistake.
  CREEM_TEST_MODE: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .default("true")
      .transform((value) => !["false", "0", "no", "off"].includes(value.trim().toLowerCase())),
  ),
  // One Creem product per plan and interval, plus Pro monthly with the 3-day trial. Pro monthly
  // turns checkout on; other options are offered only while their id is set.
  CREEM_PRO_MONTHLY_PRODUCT_ID: optionalString,
  CREEM_PRO_YEARLY_PRODUCT_ID: optionalString,
  CREEM_PRO_WEEKLY_PRODUCT_ID: optionalString,
  CREEM_MAX_MONTHLY_PRODUCT_ID: optionalString,
  CREEM_MAX_YEARLY_PRODUCT_ID: optionalString,
  CREEM_MAX_WEEKLY_PRODUCT_ID: optionalString,
  CREEM_PRO_TRIAL_PRODUCT_ID: optionalString,
  // Optional, for "Import from GitHub": a fine-grained token with public read-only access and no
  // other permissions. Without it GitHub allows this server 60 calls an hour.
  GITHUB_TOKEN: optionalString,
  // Scheduled jobs (/api/cron/*): Vercel Cron sends it as "Authorization: Bearer <secret>". Without
  // it (or under 16 characters) every job refuses to run. Also signs the reminder unsubscribe links.
  CRON_SECRET: optionalString,
  // Reminder emails through Resend. Both are needed; without them reminders stay in-app only.
  // EMAIL_FROM like "Otto Sensei <otto@yourdomain.com>", on a domain verified in Resend.
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
});

export type Env = z.infer<typeof EnvSchema>;

// Parsed lazily so tests can set process.env before the first read.
let cached: Env | null = null;
// Once per process: appUrl() runs for every page's metadata, and one line is enough to notice.
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

/** null when Supabase isn't set up, which turns sign-in off. */
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

// Tolerates a bare host such as "example.com", which `new URL()` in metadataBase would reject.
function origin(value: string): string {
  const trimmed = value.trim();
  const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return url.replace(/\/+$/, "");
}

// NEXT_PUBLIC_APP_URL, else Vercel's production domain, else localhost. Previews get the production
// domain on purpose so canonical links and the sitemap never point crawlers at a preview.
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
