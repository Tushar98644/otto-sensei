import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { hintTarget, LanguageHint } from "./language-hint";
import { pageLanguages } from "./language-picker";

const PUBLISHED = {
  en: ["/", "/pricing", "/compare"],
  es: ["/", "/pricing"],
  de: ["/pricing"],
} as const;

describe("the language hint", () => {
  it("offers the page in the browser's first language it's published in, never over English", () => {
    const pricing = pageLanguages("/pricing", PUBLISHED);
    expect(hintTarget(["es-MX", "en"], pricing)).toEqual({ locale: "es", href: "/es/pricing" });
    expect(hintTarget(["ja", "de-AT"], pricing)).toEqual({ locale: "de", href: "/de/pricing" });
    expect(hintTarget(["en-GB", "es"], pricing)).toBeNull();
    expect(hintTarget(["fr-FR"], pricing)).toBeNull();
    expect(hintTarget(["es"], pageLanguages("/compare", PUBLISHED))).toBeNull();
  });

  it("reads the same path whether the server sees /en/… or the browser sees /…", () => {
    expect(pageLanguages("/en/pricing", PUBLISHED)).toEqual(pageLanguages("/pricing", PUBLISHED));
    expect(pageLanguages("/", PUBLISHED).map(({ href }) => href)).toEqual(["/", "/es"]);
    expect(pageLanguages("/studio", PUBLISHED)).toEqual([]);
  });

  it("draws nothing on the server, so the page never shifts when it appears", () => {
    const hints = { es: { text: "También en español.", link: "Leer", dismiss: "Cerrar" } };
    expect(renderToStaticMarkup(<LanguageHint hints={hints} published={PUBLISHED} />)).toBe("");
  });
});
