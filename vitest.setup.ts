import { vi } from "vitest";

// Every test file gets its own module registry, so each one restores a fresh in-memory Postgres
// (built from the real migrations) the first time it touches the database, and a fresh fake
// Supabase Auth. Nothing in a test can reach a real database or Supabase project.
vi.mock("@/db/client", () => import("@/db/testing"));
vi.mock(
  "@/lib/supabase/server",
  async () => (await import("@/lib/auth/test-helpers")).supabaseServerMock,
);
vi.mock(
  "@/lib/supabase/admin",
  async () => (await import("@/lib/auth/test-helpers")).supabaseAdminMock,
);

// next/font only works under Next's compiler. Pages that load fonts (the portfolio page and its
// preview) get a stand-in that hands back the CSS variable name and nothing else.
vi.mock("next/font/google", () => {
  const font = (options: { variable?: string } = {}) => ({
    className: "",
    variable: options.variable ?? "",
    style: { fontFamily: "" },
  });
  // The app's own (Inter, EB Garamond) and the portfolio templates' (templates/fonts.ts).
  const names = [
    "Inter",
    "EB_Garamond",
    "DM_Mono",
    "Figtree",
    "Fira_Code",
    "Geist",
    "Geist_Mono",
    "Geist_Pixel",
    "Montserrat",
    "Roboto_Condensed",
  ];
  return Object.fromEntries(names.map((name) => [name, font]));
});

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
  "CREEM_API_KEY",
  "CREEM_WEBHOOK_SECRET",
]) {
  delete process.env[name];
}
