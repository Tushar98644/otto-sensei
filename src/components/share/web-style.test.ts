import { describe, expect, it } from "vitest";
import { PDF_FONT_FAMILIES } from "@/lib/pdf/fonts";
import { isBehind, viewFacts } from "./share-facts";
import { webStyle } from "./web-style";

describe("webStyle", () => {
  it("turns points into screen lengths and keeps unitless values", () => {
    expect(
      webStyle({ fontSize: 10, lineHeight: 1.35, letterSpacing: -0.4, fontWeight: "bold" }),
    ).toEqual({
      fontSize: "calc(10 * var(--pt))",
      lineHeight: 1.35,
      letterSpacing: "calc(-0.4 * var(--pt))",
      fontWeight: "bold",
    });
  });

  it("spells out react-pdf shorthands and maps its fonts and small capitals", () => {
    expect(
      webStyle({
        paddingHorizontal: 50,
        marginVertical: 2,
        fontFamily: "TeX Gyre Pagella",
        fontFeatureSettings: ["smcp"],
      }),
    ).toEqual({
      paddingLeft: "calc(50 * var(--pt))",
      paddingRight: "calc(50 * var(--pt))",
      marginTop: "calc(2 * var(--pt))",
      marginBottom: "calc(2 * var(--pt))",
      fontFamily: PDF_FONT_FAMILIES["TeX Gyre Pagella"].css,
      fontVariantCaps: "small-caps",
    });
    expect(webStyle({ fontFamily: ["CMU Serif", "Tinos"] }).fontFamily).toContain("CMU Serif");
    expect(webStyle({ fontFamily: "Unknown" }).fontFamily).toBe(PDF_FONT_FAMILIES.Carlito.css);
  });

  it("draws rules at least a pixel thick, and none when the width is zero", () => {
    expect(webStyle({ borderBottomWidth: 0.5, borderBottomColor: "#b3b3b3" })).toEqual({
      borderBottomWidth: "max(1px, calc(0.5 * var(--pt)))",
      borderBottomStyle: "solid",
      borderBottomColor: "#b3b3b3",
    });
    expect(webStyle({ borderBottomWidth: 0 })).toEqual({ borderBottomWidth: 0 });
  });

  it("leaves out what the page sets itself", () => {
    expect(
      webStyle({ paddingHorizontal: 50, paddingTop: 40, fontSize: 10, textAlign: "right" }, [
        "paddingHorizontal",
        "paddingTop",
        "textAlign",
      ]),
    ).toEqual({ fontSize: "calc(10 * var(--pt))" });
    expect(webStyle(undefined)).toEqual({});
  });
});

describe("viewFacts", () => {
  const HOUR = 60 * 60 * 1000;
  const now = 10 * 24 * HOUR;

  it("says when nobody has opened it yet", () => {
    expect(viewFacts({ views: 0, lastViewedAt: null, createdAt: now - 2 * HOUR }, now)).toBe(
      "No views yet · Shared 2 hours ago",
    );
  });

  it("counts views and says when it was last opened", () => {
    expect(
      viewFacts({ views: 1, lastViewedAt: now - HOUR, createdAt: now - 3 * 24 * HOUR }, now),
    ).toBe("1 view · Last opened 1 hour ago · Shared 3 days ago");
    expect(
      viewFacts({ views: 1_200, lastViewedAt: now - HOUR, createdAt: now - HOUR }, now),
    ).toMatch(/^1,200 views · /);
  });

  it("knows when the resume changed after it was shared", () => {
    expect(isBehind({ versionAt: 5 }, { updatedAt: 5 })).toBe(false);
    expect(isBehind({ versionAt: 5 }, { updatedAt: 6 })).toBe(true);
  });
});
