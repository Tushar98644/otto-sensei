import { vi } from "vitest";

// Every test file gets its own module registry, so each one restores a fresh in-memory Postgres
// (built from the real migrations) the first time it touches the database, and a fresh fake
// Supabase Auth. Nothing in a test can reach a real database or Supabase project.
vi.mock("@/db/client", () => import("@/db/testing"));
vi.mock("@/lib/supabase/server", async () => (await import("@/lib/auth/test-helpers")).supabaseServerMock);
vi.mock("@/lib/supabase/admin", async () => (await import("@/lib/auth/test-helpers")).supabaseAdminMock);

for (const name of [
  "DATABASE_URL",
  "DIRECT_DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENROUTER_API_KEY",
  "DODO_PAYMENTS_API_KEY",
]) {
  delete process.env[name];
}
