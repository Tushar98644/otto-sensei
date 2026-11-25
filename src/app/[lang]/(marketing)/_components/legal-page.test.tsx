import { readFileSync } from "node:fs";
import Link from "next/link";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { formatFor } from "@/i18n/intl";
import { englishMessages } from "@/i18n/messages";
import { pickReading } from "./legal-contents";
import { headingId, LegalPage, SHORT_VERSION_ID, withHeadingIds } from "./legal-page";

const t = englishMessages().legal.page;
const english = { t, format: formatFor("en"), path: "/terms" };

const h2Ids = (html: string) => [...html.matchAll(/<h2 id="([^"]+)"/g)].map((match) => match[1]);
const anchors = (html: string) => [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);

describe("headingId", () => {
  it("turns a title into a short, readable anchor", () => {
    expect(headingId("Who we are")).toBe("who-we-are");
    expect(headingId("Don't misuse it")).toBe("dont-misuse-it");
    expect(headingId("Plans and their limits")).toBe("plans-and-their-limits");
    expect(headingId("  What's new?  ")).toBe("whats-new");
  });
});

describe("withHeadingIds", () => {
  it("keeps every id unique and off the ids the page already uses", () => {
    const ids = withHeadingIds([
      { title: "Contact" },
      { title: "Contact" },
      { title: "Short version" },
      { title: "Main" },
      { title: "!!!" },
    ]).map((section) => section.id);
    expect(ids).toEqual(["contact", "contact-2", "short-version-2", "main-2", "section"]);
  });

  it("takes the id from the English title when one is given", () => {
    const ids = withHeadingIds([{ title: "Quiénes somos", anchor: "Who we are" }, { title: "Ñ" }]);
    expect(ids.map((section) => section.id)).toEqual(["who-we-are", "section"]);
  });
});

describe("LegalPage", () => {
  const sections = [
    { title: "Who we are", body: <p>Us.</p> },
    { title: "Don't misuse it", body: <p>Please.</p> },
  ];

  it("gives each section a heading id and links to all of them from the contents", () => {
    const html = renderToStaticMarkup(<LegalPage {...english} title="Terms" sections={sections} />);
    expect(h2Ids(html)).toEqual(["who-we-are", "dont-misuse-it"]);
    // One list for wide screens and one folded under the title on phones.
    expect(anchors(html)).toEqual(["who-we-are", "dont-misuse-it", "who-we-are", "dont-misuse-it"]);
    expect(html.match(/<nav aria-label="Contents"/g)).toHaveLength(2);
    expect(html).toContain("<details");
    expect(html).not.toContain(SHORT_VERSION_ID);
    expect(html).toContain("Last updated:");
    expect(html).not.toContain("translation");
  });

  it("puts the short version first, under the intro, with its action", () => {
    const html = renderToStaticMarkup(
      <LegalPage
        {...english}
        title="Refunds"
        intro={<p>Intro line.</p>}
        summary={["First fact.", "Second fact."]}
        action={<Link href="/account#plan">Manage billing</Link>}
        sections={sections}
      />,
    );
    expect(h2Ids(html)).toEqual([SHORT_VERSION_ID, "who-we-are", "dont-misuse-it"]);
    expect(anchors(html).slice(0, 3)).toEqual([SHORT_VERSION_ID, "who-we-are", "dont-misuse-it"]);
    const intro = html.indexOf("Intro line.");
    const summary = html.indexOf("First fact.");
    const action = html.indexOf("Manage billing");
    const firstSection = html.indexOf('id="who-we-are"');
    expect(intro).toBeGreaterThan(-1);
    expect(intro).toBeLessThan(summary);
    expect(summary).toBeLessThan(action);
    expect(action).toBeLessThan(firstSection);
  });

  it("says on a translation that the English version applies, linking to it", () => {
    const html = renderToStaticMarkup(
      <LegalPage
        {...english}
        format={formatFor("es")}
        updated="2026-11-23"
        title="Términos"
        sections={sections}
      />,
    );
    expect(html).toContain("If it differs from the");
    const link = /<a ([^>]*)>English version<\/a>/.exec(html)?.[1];
    expect(link).toContain('href="/terms"');
    expect(link).toMatch(/hreflang="en"/i);
    expect(html).toContain("23 de noviembre de 2026");
  });
});

describe("pickReading", () => {
  const tops = (...values: number[]) => values.map((top, index) => ({ id: `s${index + 1}`, top }));

  it("marks the last heading that has scrolled past the reading line", () => {
    expect(pickReading(tops(400, 900, 1400), { atEnd: false })).toBeNull();
    expect(pickReading(tops(96, 600, 1100), { atEnd: false })).toBe("s1");
    expect(pickReading(tops(-800, 120, 700), { atEnd: false })).toBe("s2");
  });

  it("marks the last section once the page can't scroll any further", () => {
    expect(pickReading(tops(-1200, -300, 500), { atEnd: true })).toBe("s3");
    expect(pickReading([], { atEnd: true })).toBeNull();
  });
});

describe("prose tables", () => {
  const css = readFileSync(new URL("../../../globals.css", import.meta.url), "utf8");
  const prose = css.slice(
    css.indexOf("@utility prose-otto {"),
    css.indexOf("@utility scroll-pan-frame"),
  );
  const rule = (selector: string) => {
    const start = prose.indexOf(`& ${selector} {`);
    return prose.slice(start, prose.indexOf("}", start));
  };

  it("rule rows like a row list, with no box around the table", () => {
    expect(rule(":where(table)")).toContain("border-top: 1px solid var(--color-border)");
    expect(rule(":where(table)")).not.toMatch(/border:|border-radius|overflow/);
    expect(rule(":where(th, td)")).toContain("border-bottom: 1px solid var(--color-border)");
    expect(prose).not.toContain("tr:last-child");
    expect(rule(":where(thead th)")).not.toContain("background");
  });
});
