import { vi } from "vitest";

vi.mock("@/db/client", () => import("@/db/testing"));
vi.mock(
  "@/lib/supabase/server",
  async () => (await import("@/lib/auth/test-helpers")).supabaseServerMock,
);
vi.mock(
  "@/lib/supabase/admin",
  async () => (await import("@/lib/auth/test-helpers")).supabaseAdminMock,
);

// next/font only works under Next's compiler.
vi.mock("next/font/google", () => {
  const font = (options: { variable?: string } = {}) => ({
    className: "",
    variable: options.variable ?? "",
    style: { fontFamily: "" },
  });
  const names = [
    "Caveat",
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
  "DODO_API_KEY",
  "DODO_WEBHOOK_SECRET",
  "DODO_ENVIRONMENT",
  "DODO_PRO_MONTHLY_PRODUCT_ID",
  "DODO_PRO_YEARLY_PRODUCT_ID",
  "DODO_MAX_MONTHLY_PRODUCT_ID",
  "DODO_MAX_YEARLY_PRODUCT_ID",
  "DODO_PRO_TRIAL_PRODUCT_ID",
  "BILLING_SIGNING_SECRET",
]) {
  delete process.env[name];
}
