import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCALES, type Locale } from "@/i18n/config";
import { PUT } from "@/app/api/language/route";
import { cookieJar, resetDb } from "@/lib/auth/test-helpers";
import { fail } from "./respond";
import { localizeError, translatorOf, withApiLocale } from "./localize";

// Spanish is live here only: the app's real switch (ENABLED_LOCALES) stays English until the language setting ships.
vi.mock("@/i18n/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n/config")>();
  return { ...actual, isEnabledLocale: (value: unknown) => value === "en" || value === "es" };
});
vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const request = (lang?: string) =>
  new Request("http://localhost/api/test", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...(lang ? { cookie: `theme=dark; otto_lang=${lang}` } : {}),
    },
    body: "{}",
  });

const messageOf = async (res: Response) =>
  ((await res.json()) as { error: { message: string } }).error.message;

describe("API errors in the reader's language", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("answers a real route in Spanish when otto_lang says es", async () => {
    const res = await PUT(request("es"));
    expect(res.status).toBe(401);
    expect(await messageOf(res)).toBe("Inicia sesión para cambiar el idioma de la app.");
  });

  it("keeps English byte for byte without the cookie, or with a language that isn't live", async () => {
    for (const lang of [undefined, "fr", "xx"]) {
      const res = await PUT(request(lang));
      expect(await messageOf(res)).toBe("Sign in to change the app's language.");
    }
    const english = fail("unauthorized", "Sign in first.", 401);
    expect(await localizeError(request(), english)).toBe(english);
  });

  it("leaves answers that aren't JSON errors alone", async () => {
    const ok = Response.json({ ok: true, message: "Sign in first." });
    expect(await localizeError(request("es"), ok)).toBe(ok);
    const text = new Response("Sign in first.", { status: 401 });
    expect(await localizeError(request("es"), text)).toBe(text);
  });

  it("keeps the status, code and headers", async () => {
    const handler = withApiLocale<[Request]>(async () =>
      fail("rate_limited", "That's a lot at once. Try again in 2 minutes.", 429, {
        "Retry-After": "120",
      }),
    );
    const res = await handler(request("es"));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("120");
    expect(await res.json()).toEqual({
      ok: false,
      error: {
        code: "rate_limited",
        message: "Es mucho a la vez. Inténtalo de nuevo en 2 minutos.",
      },
    });
  });

  it("puts messages built from several sentences and values together", async () => {
    const es = await translatorOf("es");
    expect(es("Tailoring comes with Pro. Try Pro for 7 days.")).toBe(
      "Adaptar viene con Pro. Prueba Pro por 7 días.",
    );
    expect(es("You've used this month's 30 line fixes. Max has 100 a month.")).toBe(
      "Ya usaste tus 30 correcciones de línea de este mes. Max tiene 100 al mes.",
    );
    expect(es("Free keeps 1 resume. Try Pro for 7 days.")).toBe(
      "Gratis guarda 1 currículum. Prueba Pro por 7 días.",
    );
    const de = await translatorOf("de");
    expect(
      de(
        "Pro tracks 1,000 applications. Delete some old ones to add more, or move to Max for 5,000.",
      ),
    ).toBe(
      "Pro verfolgt 1.000 Bewerbungen. Lösch ein paar alte, um mehr hinzuzufügen, oder wechsle zu Max für 5.000.",
    );
    expect(de("They reset on Dec 1, when your plan renews.")).toBe(
      "Sie werden am 1. Dez. bei der Verlängerung deines Tarifs zurückgesetzt.",
    );
    expect(es("Something only a person would write.")).toBe("Something only a person would write.");
  });
});

// Every error sentence a wrapped route writes has a translation, so a new one can't ship in English by accident.
const API = fileURLToPath(new URL("../../app/api", import.meta.url));
const UNWRAPPED =
  /\/(cron|inbound|extension|health)\/|\/billing\/webhook\/|\/calendar\/\[token\]\//;
const SENTENCE = /^[A-Z][^]*[a-z][^]*[.!?]$/;

function routeFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) routeFiles(file, out);
    else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) out.push(file);
  }
  return out;
}

function sentencesIn(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.text.trim();
      if (text.includes(" ") && SENTENCE.test(text)) found.push(text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe.each(LOCALES.filter((locale): locale is Exclude<Locale, "en"> => locale !== "en"))(
  "every API error sentence in %s",
  (locale) => {
    it("has a translation", async () => {
      const translate = await translatorOf(locale);
      const files = routeFiles(API).filter((file) => !UNWRAPPED.test(file));
      const missing = files.flatMap((file) =>
        sentencesIn(file)
          .filter((text) => translate(text) === text)
          .map((text) => `${path.relative(API, file)}: ${text}`),
      );
      expect(missing).toEqual([]);
    });
  },
);
