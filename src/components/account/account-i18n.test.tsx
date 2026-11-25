import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ottoLines } from "@/components/mascot/lines";
import type { UsagePeriod } from "@/config/plans";
import { formatFor } from "@/i18n/intl";
import { loadMessages } from "@/i18n/messages";
import { withMessages } from "@/i18n/messages-testing";
import { setRootLang } from "@/i18n/testing";

vi.mock("./use-me", () => ({
  useMe: () => ({ me: { auth: { mode: "supabase" } }, user: null, loading: false }),
  patchMe: () => {},
  refreshMe: async () => {},
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

const { SignInForm } = await import("./sign-in-form");
const { PlanOffer } = await import("./plan-offer");
const { BillingNote } = await import("./billing-note");
const { upgradeOffer } = await import("./upgrade-offer");
const { LoginScreen, loginWords } =
  await import("@/app/[lang]/(marketing)/login/_components/login-screen");

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

afterEach(() => setRootLang("en"));

describe("sign-in in Spanish", () => {
  it("draws the form from the signIn namespace", async () => {
    const html = renderToStaticMarkup(await withMessages("es", ["signIn"], <SignInForm />));
    expect(html).toContain("Continuar con Google");
    expect(html).toContain("Envíame un código");
    expect(html).toContain('placeholder="tu@ejemplo.com"');
    expect(text(html)).toContain("¿Eres nuevo? Esto crea tu cuenta gratis.");
    expect(html).toContain("(se abre en una pestaña nueva)");
    expect(html).not.toContain("Continue with Google");
  });

  it("serves /es/login in Spanish, the form included, with links to the Spanish legal pages", async () => {
    setRootLang("es");
    const html = renderToStaticMarkup(<LoginScreen {...await loginWords()} variant={null} />);
    expect(html).toContain("Iniciar sesión");
    expect(html).toContain("Usa Google, o te envío por correo un código de 6 dígitos.");
  });

  it("passes the words and legal links /login gives it, with no provider", async () => {
    const words = await loadMessages("es", "signIn");
    const html = renderToStaticMarkup(
      <SignInForm words={words} legal={{ terms: "/es/terms", privacy: "/es/privacy" }} />,
    );
    expect(html).toContain("Continuar con Google");
    expect(html).toContain('href="/es/terms"');
    expect(html).toContain('href="/es/privacy"');
  });
});

describe("plan offers in Spanish", () => {
  it("draws the plan cards and billing note from the upgrade namespace", async () => {
    const { cards, intervals, interval } = upgradeOffer({
      current: "free",
      offer: { pro: ["month", "year"], max: ["month"] },
      picked: "month",
      trial: false,
    });
    const html = renderToStaticMarkup(
      await withMessages(
        "es",
        ["upgrade"],
        <>
          <PlanOffer
            cards={cards}
            intervals={intervals}
            interval={interval}
            onIntervalChange={() => {}}
            onChoose={() => {}}
          />
          <BillingNote mode="mock" />
        </>,
      ),
    );
    const words = text(html);
    expect(words).toContain("Cada cuánto pagar");
    expect(words).toContain("Pásate a Max");
    expect(words).toContain("versiones adaptadas al mes");
    expect(words).toContain("Modo de prueba");
    expect(words).not.toMatch(/Upgrade to|a month|Test mode/);
  });
});

describe("Otto's lines in Spanish", () => {
  const MONTH: UsagePeriod = { kind: "month", resetsAt: Date.UTC(2026, 11, 17, 12), renews: true };

  it("words limits, plans and sign-in reasons in Spanish", async () => {
    const otto = ottoLines(
      {
        otto: await loadMessages("es", "otto"),
        signIn: await loadMessages("es", "signIn"),
        usage: (await loadMessages("es", "app")).usage,
      },
      formatFor("es"),
    );
    expect(otto.limit.reached("tailor", 60, MONTH)).toMatch(
      /^Ya usaste tus 60 versiones adaptadas de este mes\. Se reinician el 1[78] dic/,
    );
    expect(otto.limit.none("tailor")).toBe("Adaptar viene con Pro. Prueba Pro por 7 días.");
    expect(otto.limit.full("resumes", "pro", 40)).toBe(
      "Pro guarda 25 currículums; tienes 40. Borra 16 para guardar otro, o pásate a Max para tener 50.",
    );
    expect(otto.signIn.reason("fix")).toBe(
      "Inicia sesión para corregir líneas conmigo. En Free tienes 3 al mes.",
    );
    expect(otto.writing("free", { used: 0, limit: 0 }, null)).toBe(
      "Las cartas, los mensajes de contacto, las respuestas y la preparación para entrevistas vienen con Pro. Prueba Pro por 7 días.",
    );
  });
});
