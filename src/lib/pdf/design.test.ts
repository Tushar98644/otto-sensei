import { describe, expect, it } from "vitest";
import { applyDesign, tint } from "@/components/pdf/design";
import { TEMPLATE_THEMES, themeFor } from "@/components/pdf/themes";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { ACCENT_COLORS, designKey, designOf, sameDesign, withDesign } from "./design";
import { visibleResume } from "./visible";

const resume = (design?: unknown): Resume =>
  ({ ...emptyResume(0), ...(design === undefined ? {} : { design }) }) as Resume;

describe("look settings on the resume", () => {
  it("reads only known values, since saved copies are never re-parsed", () => {
    expect(designOf(resume())).toEqual({});
    expect(designOf(resume("navy"))).toEqual({});
    expect(designOf(resume({ accent: "pink", font: "serif", density: "airy" }))).toEqual({
      font: "serif",
    });
  });

  it("sets and clears values, dropping design once nothing is set", () => {
    const styled = withDesign(resume(), { accent: "navy", density: "compact" });
    expect(styled.design).toEqual({ accent: "navy", density: "compact" });
    const plain = withDesign(withDesign(styled, { accent: undefined }), { density: undefined });
    expect("design" in plain).toBe(false);
    expect(designKey(styled)).toBe("navy/-/compact");
    expect(designKey(plain)).toBe("-/-/-");
    expect(sameDesign({ font: "sans" }, { font: "sans" })).toBe(true);
  });

  it("uses dark print colors for every accent", () => {
    expect(ACCENT_COLORS).toEqual({
      ink: "#1b1b1b",
      forest: "#0e3b2e",
      navy: "#1d3557",
      burgundy: "#6b1d2a",
      slate: "#3b4a5a",
    });
  });
});

describe("applyDesign", () => {
  it("leaves every format as it was without settings", () => {
    for (const theme of Object.values(TEMPLATE_THEMES)) expect(applyDesign(theme, {})).toBe(theme);
  });

  it("colors what each format colors, and adds no rule a format doesn't draw", () => {
    const color = ACCENT_COLORS.burgundy;
    const classic = applyDesign(TEMPLATE_THEMES.classic, { accent: "burgundy" }).styles;
    expect(classic.sectionTitle.color).toBe(color);
    expect(classic.sectionTitle.borderBottomColor).toBeUndefined();
    const minimal = applyDesign(TEMPLATE_THEMES.minimal, { accent: "burgundy" }).styles;
    expect(minimal.sectionTitle.color).toBe(color);
    expect(minimal.sectionTitleRule.borderBottomColor).toBe(color);
    // Modern: only the heading's first letters, the headline and places take the accent; its
    // rules stay gray, as in Awesome-CV.
    const modern = applyDesign(TEMPLATE_THEMES.modern, { accent: "forest" }).styles;
    expect(modern.sectionTitleAccent.color).toBe(ACCENT_COLORS.forest);
    expect(modern.headline.color).toBe(ACCENT_COLORS.forest);
    expect(modern.sectionTitle.color).toBe(TEMPLATE_THEMES.modern.styles.sectionTitle.color);
    expect(modern.sectionTitleRule.borderBottomColor).toBe(
      TEMPLATE_THEMES.modern.styles.sectionTitleRule.borderBottomColor,
    );
    // Executive: the name, headings and bullets, with the rule a light tint of the same hue.
    const executive = applyDesign(TEMPLATE_THEMES.executive, { accent: "burgundy" }).styles;
    expect(executive.name.color).toBe(color);
    expect(executive.bulletGlyph.color).toBe(color);
    expect(executive.sectionTitleRule.borderBottomColor).toBe(tint(color, 0.55));
    // Body text stays ink.
    expect(classic.page.color).toBe(TEMPLATE_THEMES.classic.styles.page.color);
  });

  it("swaps every family a format uses for the chosen one", () => {
    const serif = applyDesign(TEMPLATE_THEMES.developer, { font: "serif" }).styles;
    expect(serif.page.fontFamily).toBe("Tinos");
    const sans = applyDesign(TEMPLATE_THEMES.modern, { font: "sans" }).styles;
    expect(sans.page.fontFamily).toBe("Carlito");
    // Modern's Roboto name and contact lines too.
    expect(sans.name.fontFamily).toBe("Carlito");
    expect(sans.contact.fontFamily).toBe("Carlito");
  });

  it("draws the bullet and swaps a separator the chosen font has no glyph for", () => {
    expect(applyDesign(TEMPLATE_THEMES.compact, {}).drawBullet).toBeFalsy();
    const sans = applyDesign(TEMPLATE_THEMES.compact, { font: "sans" });
    expect(sans.drawBullet).toBe(true);
    expect(sans.contactSeparator).toBe(" | ");
    expect(applyDesign(TEMPLATE_THEMES.compact, { font: "serif" }).contactSeparator).toBe(" ■ ");
  });

  it("takes about 10% off the spacing with compact, never the type size", () => {
    const base = TEMPLATE_THEMES.classic.styles;
    const compact = applyDesign(TEMPLATE_THEMES.classic, { density: "compact" }).styles;
    expect(compact.page.paddingTop).toBeCloseTo((base.page.paddingTop as number) * 0.9, 1);
    expect(compact.section.marginTop).toBeCloseTo((base.section.marginTop as number) * 0.9, 1);
    expect(compact.entry.marginTop).toBeCloseTo((base.entry.marginTop as number) * 0.9, 1);
    expect(compact.page.lineHeight as number).toBeLessThan(base.page.lineHeight as number);
    expect(compact.page.lineHeight as number).toBeGreaterThanOrEqual(1.15);
    expect(compact.page.fontSize).toBe(base.page.fontSize);
    expect(compact.name.fontSize).toBe(base.name.fontSize);
  });

  it("is what themeFor prints", () => {
    const styled = resume({ accent: "slate", font: "serif" });
    expect(themeFor({ ...styled, template: "modern" }).styles.page.fontFamily).toBe("Tinos");
    expect(themeFor(styled, "classic").styles.sectionTitle.color).toBe(ACCENT_COLORS.slate);
  });
});

describe("visibleResume", () => {
  it("drops hidden sections, entries, lines, groups and extras", () => {
    const source: Resume = {
      ...emptyResume(0),
      summary: "Hello",
      experience: [
        {
          id: "e1",
          company: "A",
          title: "B",
          location: "",
          startDate: "",
          endDate: "",
          bullets: [
            { id: "b1", text: "Shown" },
            { id: "b2", text: "Hidden", hidden: true },
          ],
        },
        {
          id: "e2",
          company: "C",
          title: "D",
          location: "",
          startDate: "",
          endDate: "",
          bullets: [],
          hidden: true,
        },
      ],
      skills: [{ id: "k1", label: "", items: ["Go"], hidden: true }],
      extras: [
        { id: "x1", kind: "awards", title: "Awards", items: [], hidden: true },
        {
          id: "x2",
          kind: "languages",
          title: "Languages",
          items: [
            { id: "i1", title: "Spanish", subtitle: "", date: "", detail: "", bullets: [] },
            {
              id: "i2",
              title: "French",
              subtitle: "",
              date: "",
              detail: "",
              bullets: [],
              hidden: true,
            },
          ],
        },
      ],
      hiddenSections: ["summary"],
    };
    const shown = visibleResume(source);
    expect(shown.summary).toBe("");
    expect(shown.sectionOrder).not.toContain("summary");
    expect(shown.experience.map((job) => job.id)).toEqual(["e1"]);
    expect(shown.experience[0]!.bullets.map((b) => b.id)).toEqual(["b1"]);
    expect(shown.skills).toEqual([]);
    expect(shown.extras?.map((x) => [x.id, x.items.map((i) => i.id)])).toEqual([["x2", ["i1"]]]);
    // The source keeps everything.
    expect(source.experience[0]!.bullets).toHaveLength(2);
  });
});
