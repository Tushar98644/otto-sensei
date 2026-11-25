import { describe, expect, it } from "vitest";
import { checkMessages, isPluralForms } from "./check";

const english = {
  title: "Your resumes",
  greeting: "Hi {name}",
  terms: "Read the <link>terms</link> and <b>agree</b>",
  count: { one: "{count} resume", other: "{count} resumes" },
  menu: { open: "Open", close: "Close" },
};

const spanish = {
  title: "Tus currículums",
  greeting: "Hola {name}",
  terms: "Lee los <link>términos</link> y <b>acepta</b>",
  count: { one: "{count} currículum", other: "{count} currículums" },
  menu: { open: "Abrir", close: "Cerrar" },
};

const withSpanish = (change: Record<string, unknown>) => ({ ...spanish, ...change });

describe("checkMessages", () => {
  it("passes a complete, faithful translation", () => {
    expect(checkMessages("en", english)).toEqual([]);
    expect(checkMessages("es", spanish, english)).toEqual([]);
  });

  it("finds missing and extra keys, at any depth", () => {
    const noTitle = Object.fromEntries(Object.entries(spanish).filter(([key]) => key !== "title"));
    expect(checkMessages("es", noTitle, english)).toEqual(["title: missing"]);
    expect(checkMessages("es", withSpanish({ menu: { open: "Abrir" } }), english)).toEqual([
      "menu.close: missing",
    ]);
    expect(checkMessages("es", withSpanish({ extra: "Más" }), english)).toEqual([
      "extra: not in English",
    ]);
    expect(checkMessages("es", withSpanish({ menu: "Menú" }), english)).toEqual([
      "menu: should be a group",
    ]);
  });

  it("finds placeholders that differ from English", () => {
    expect(checkMessages("es", withSpanish({ greeting: "Hola {nombre}" }), english)).toEqual([
      "greeting: placeholders {nombre} differ from English {name}",
    ]);
    expect(checkMessages("es", withSpanish({ greeting: "Hola" }), english)).toHaveLength(1);
  });

  it("finds tags that differ from English, unknown tags and nesting", () => {
    expect(
      checkMessages("es", withSpanish({ terms: "Lee los términos y <b>acepta</b>" }), english),
    ).toEqual(["terms: tags differ from English"]);
    expect(checkMessages("en", { a: "Click <i>here</i>" })[0]).toMatch(/^a: bad tags/);
    expect(checkMessages("en", { a: "<b>bold <link>x</link></b>" })[0]).toMatch(/^a: bad tags/);
    expect(checkMessages("en", { a: "<b>open" })[0]).toMatch(/^a: bad tags/);
  });

  it("finds empty strings and text left in English", () => {
    expect(checkMessages("en", { a: "  " })).toEqual(["a: empty"]);
    expect(
      checkMessages("es", withSpanish({ menu: { open: "", close: "Cerrar" } }), english),
    ).toEqual(["menu.open: empty"]);
    expect(checkMessages("es", withSpanish({ title: "Your resumes" }), english)).toEqual([
      "title: still in English",
    ]);
    expect(
      checkMessages("es", withSpanish({ title: "Your resumes" }), english, new Set(["title"])),
    ).toEqual([]);
  });

  it("checks plural forms against the language's own categories", () => {
    expect(isPluralForms(english.count)).toBe(true);
    expect(isPluralForms(english.menu)).toBe(false);
    expect(
      checkMessages("es", withSpanish({ count: { other: "{count} currículums" } }), english),
    ).toEqual(['count: missing the "one" form es needs']);
    expect(
      checkMessages(
        "es",
        withSpanish({ count: { one: "1", few: "{count}", other: "{count} currículums" } }),
        english,
      ),
    ).toEqual(['count.few: es has no "few" form']);
    // Spanish may add "many" (a million); German may not.
    expect(
      checkMessages(
        "es",
        withSpanish({
          count: {
            one: "{count} currículum",
            many: "{count} de currículums",
            other: "{count} currículums",
          },
        }),
        english,
      ),
    ).toEqual([]);
    expect(
      checkMessages(
        "de",
        { count: { one: "{count} Lebenslauf", many: "x", other: "{count} Lebensläufe" } },
        { count: english.count },
      ),
    ).toEqual(['count.many: de has no "many" form']);
    expect(
      checkMessages(
        "es",
        withSpanish({ count: { one: "un currículum", other: "currículums" } }),
        english,
      ),
    ).toEqual(["count: placeholders differ from English"]);
    expect(checkMessages("es", withSpanish({ count: "currículums" }), english)).toEqual([
      "count: should be plural forms",
    ]);
  });
});
