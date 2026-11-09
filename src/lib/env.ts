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
  // OpenRouter model slugs. Each must support structured outputs and reasoning. Both default to
  // GLM 5.3 Flash; they stay separate so import structuring (copy-only) can run on something
  // cheaper or faster than fixing and tailoring.
  AI_MODEL: stringWithDefault("z-ai/glm-5.3-flash"),
  AI_STRUCTURE_MODEL: stringWithDefault("z-ai/glm-5.3-flash"),
  // Supabase Auth. Database URLs are read by src/db/connection.ts. Each value has two names: the
  // one a project made at supabase.com uses, and the one the Vercel Marketplace integration sets.
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
  // Development only: "supabase" turns off the on-screen dev codes (src/lib/auth/dev-mode.ts) and
  // signs in through Supabase with the keys above.
  // Free text on purpose: a typo must not stop the app from starting.
  DEV_AUTH: optionalString,
  // Development only: signs dev-mode session cookies. Falls back to a fixed dev secret.
  AUTH_SECRET: optionalString,
  // Creem (merchant of record) payments. The API key and webhook secret belong to one Creem
  // environment: test keys only work against the test API, live keys only against the live one.
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
  // One Creem product per plan and billing interval (PRICES_USD in src/config/plans.ts), plus Pro
  // monthly with the free 3-day trial. Pro monthly turns checkout on; every other option is offered
  // only while its id is set.
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
  // Optional: where portfolio pictures go. "supabase" (the "portfolio-media" Storage bucket, needs
  // the secret key) or "local" (web/.uploads, development only). Unset: Supabase when the secret
  // key is set, else local outside production.
  PORTFOLIO_MEDIA_STORE: z.preprocess(emptyToUndefined, z.enum(["supabase", "local"]).optional()),
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

/** Project URL and public key, or null when Supabase isn't set up (sign-in is then off). */
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

/**
 * The public origin, no trailing slash: NEXT_PUBLIC_APP_URL, else the production domain Vercel
 * gives every deployment, else localhost. Previews get the production domain on purpose, so their
 * canonical links and sitemap never point crawlers at a preview URL.
 */
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
