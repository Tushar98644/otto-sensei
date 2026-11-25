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
    "Gochi_Hand",
    "Montserrat",
    "Roboto_Condensed",
    "Shantell_Sans",
    "UnifrakturMaguntia",
    "Abril_Fatface",
    "Old_Standard_TT",
    "Outfit",
    "DM_Serif_Display",
    "Sanchez",
    "Righteous",
    "Poppins",
    "IBM_Plex_Mono",
    "IBM_Plex_Sans",
    "JetBrains_Mono",
    "Source_Serif_4",
    "Anton",
    "Space_Grotesk",
    "Lilita_One",
    "Sora",
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
  "INBOUND_EMAIL_SECRET",
  "INBOUND_ADDRESS_STYLE",
  "INBOUND_DOMAIN",
]) {
  delete process.env[name];
}

// Parts tested without a page around them read these namespaces in English, as the app's providers send them.
vi.mock("@/i18n/client", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/i18n/client")>();
  const { default: en } = await import("@/i18n/messages/en");
  type Messages = typeof en;
  const alone = new Set<keyof Messages>([
    "accountMenu",
    "app",
    "calendar",
    "formats",
    "letters",
    "onboarding",
    "otto",
    "share",
    "shareLinks",
    "signIn",
    "ui",
    "upgrade",
  ]);
  const provided = <N extends keyof Messages>(namespace: N): Messages[N] | undefined =>
    real.useProvidedMessages(namespace) ?? (alone.has(namespace) ? en[namespace] : undefined);
  return {
    ...real,
    useProvidedMessages: provided,
    useMessages: <N extends keyof Messages>(namespace: N) =>
      provided(namespace) ?? real.useMessages(namespace),
    useWordsOr: <N extends keyof Messages>(namespace: N) => {
      const messages = provided(namespace);
      if (!messages) return real.useWordsOr(namespace);
      return <T>(given: T | undefined, pick: (words: Messages[N]) => T) => given ?? pick(messages);
    },
  };
});
