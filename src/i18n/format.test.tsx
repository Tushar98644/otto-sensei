import Link from "next/link";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  allPluralCategoriesFor,
  fmt,
  placeholdersOf,
  pluralCategoriesFor,
  selectPlural,
} from "./format";
import { formatFor } from "./intl";
import { rich, tagsOf } from "./rich";

const html = (node: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(<>{node}</>);

describe("fmt", () => {
  it("fills each {placeholder}, as often as it appears", () => {
    expect(fmt("Hi {name}, {count} new for {name}", { name: "Ana", count: 3 })).toBe(
      "Hi Ana, 3 new for Ana",
    );
    expect(fmt("No placeholders")).toBe("No placeholders");
    expect(placeholdersOf("{a} and {b} and {a}")).toEqual(["a", "b", "a"]);
  });

  it("leaves a placeholder with no value as written", () => {
    const values = { name: "Ana" } as unknown as { name: string; count: number };
    expect(fmt("{name} has {count}", values)).toBe("Ana has {count}");
  });

  it("asks for exactly the values a template names", () => {
    // @ts-expect-error count is missing
    fmt("{name} has {count}", { name: "Ana" });
    // @ts-expect-error a template without placeholders takes no values
    fmt("Plain", { name: "Ana" });
    expect(fmt("{name}", { name: 0 })).toBe("0");
  });
});

describe("plurals", () => {
  it("picks the form each language uses for a count", () => {
    const forms = { one: "{count} resume", other: "{count} resumes" };
    expect(selectPlural("en", forms, 1)).toBe("{count} resume");
    expect(selectPlural("en", forms, 0)).toBe("{count} resumes");
    expect(selectPlural("en", forms, 2)).toBe("{count} resumes");
    // French counts 0 as one; English doesn't.
    expect(selectPlural("fr", { one: "un", other: "plusieurs" }, 0)).toBe("un");
    expect(selectPlural("de", { other: "alle" }, 1)).toBe("alle");
  });

  it("knows which forms each language needs for the numbers people see", () => {
    expect(pluralCategoriesFor("en").sort()).toEqual(["one", "other"]);
    expect(pluralCategoriesFor("de").sort()).toEqual(["one", "other"]);
    expect(pluralCategoriesFor("es").sort()).toEqual(["one", "other"]);
    expect(pluralCategoriesFor("pt-BR").sort()).toEqual(["one", "other"]);
    expect(pluralCategoriesFor("fr").sort()).toEqual(["one", "other"]);
    for (const locale of ["es", "fr", "pt-BR"] as const) {
      expect(allPluralCategoriesFor(locale)).toContain("many");
    }
  });

  it("writes {count} as a number in that language", () => {
    const forms = { one: "{count} job", other: "{count} jobs in {place}" };
    expect(formatFor("en").plural(forms, 1)).toBe("1 job");
    expect(formatFor("en").plural(forms, 1200, { place: "Lima" })).toBe("1,200 jobs in Lima");
    expect(formatFor("de").plural({ other: "{count} Stellen" }, 1200)).toBe("1.200 Stellen");
  });
});

describe("rich", () => {
  it("turns <b> and <link> into elements around their text", () => {
    const out = rich(
      "Read our <link>privacy policy</link>, <b>{name}</b>.",
      {
        link: (text) => <Link href="/privacy">{text}</Link>,
      },
      { name: "Ana" },
    );
    expect(html(out)).toBe('Read our <a href="/privacy">privacy policy</a>, <strong>Ana</strong>.');
  });

  it("tells each link its place, so one message can hold two different links", () => {
    const hrefs = ["/terms", "/privacy"];
    const out = rich("Read the <link>terms</link> and <link>privacy policy</link>.", {
      link: (text, index) => <Link href={hrefs[index] ?? "/"}>{text}</Link>,
    });
    expect(html(out)).toBe(
      'Read the <a href="/terms">terms</a> and <a href="/privacy">privacy policy</a>.',
    );
  });

  it("returns plain text when there are no tags", () => {
    expect(rich("Hello {name}", {}, { name: "Ana" })).toBe("Hello Ana");
  });

  it("never reads tags out of a value", () => {
    const out = rich("Hi <b>{name}</b>", {}, { name: "<link>x</link>" });
    expect(html(out)).toBe("Hi <strong>&lt;link&gt;x&lt;/link&gt;</strong>");
  });

  it("lists the tags a message uses", () => {
    expect(tagsOf("a <b>b</b> <link>c</link>")).toEqual(["<b>", "</b>", "<link>", "</link>"]);
  });
});

describe("formatFor", () => {
  it("formats in the locale's own way", () => {
    const en = formatFor("en");
    expect(en.number(1234.5)).toBe("1,234.5");
    expect(en.currency(15)).toBe("$15.00");
    expect(en.currency(15, "USD", { maximumFractionDigits: 0 })).toBe("$15");
    expect(en.list(["a", "b", "c"])).toBe("a, b, and c");
    expect(en.relativeTime(-1, "day", { numeric: "auto" })).toBe("yesterday");
    expect(en.date(Date.UTC(2026, 10, 25), { dateStyle: "medium", timeZone: "UTC" })).toBe(
      "Nov 25, 2026",
    );
    expect(formatFor("de").number(1234.5)).toBe("1.234,5");
    expect(formatFor("es").list(["a", "b"])).toBe("a y b");
  });

  it("builds each locale's formatter once", () => {
    expect(formatFor("fr")).toBe(formatFor("fr"));
    expect(formatFor("fr")).not.toBe(formatFor("de"));
    expect(formatFor("fr").locale).toBe("fr");
  });
});
