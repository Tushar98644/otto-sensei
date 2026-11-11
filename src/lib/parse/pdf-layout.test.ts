import { describe, expect, it } from "vitest";
import { groupRows, hasColumnGutter, rowText, type LayoutItem } from "./pdf-layout";

function item(str: string, x: number, baseline: number, size = 10): LayoutItem {
  return { str, x, y: baseline - size, width: str.length * size * 0.5, height: size, fontName: "f1", baseline, upright: true };
}

const texts = (rows: ReturnType<typeof groupRows>) => rows.map((row) => rowText(row.items));

describe("groupRows and rowText", () => {
  it("joins items on one baseline, left to right, with spaces and tabs by gap size", () => {
    const rows = groupRows([
      item("Present", 500, 100),
      item("Engineer,", 50, 100),
      item("Acme", 97, 100),
      item("Jan 2021 -", 448, 100),
      item("Next line", 50, 114),
    ]);
    expect(texts(rows)).toEqual(["Engineer, Acme\tJan 2021 - Present", "Next line"]);
  });

  it("keeps a superscript on its line but never merges two real lines", () => {
    const rows = groupRows([item("1", 80, 97, 6), item("Ranked", 50, 100), item("Below", 50, 111)]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.items.map((part) => part.str)).toEqual(["Ranked", "1"]);
  });

  it("glues pieces of one word and drops fake-bold duplicates", () => {
    const rows = groupRows([item("Expe", 50, 100), item("rience", 70, 100), item("Jane", 50, 120), item("Jane", 50.4, 120.2)]);
    expect(texts(rows)).toEqual(["Experience", "Jane"]);
  });
});

describe("hasColumnGutter", () => {
  const sidebar = ["Python", "TypeScript", "React", "Node.js", "SQL", "Docker", "Contact", "London"];
  const main = Array.from({ length: 10 }, (_, i) => `• Shipped a feature that helped many customers, number ${i}`);

  it("finds a sidebar next to a main column", () => {
    const items = [
      ...sidebar.map((text, i) => item(text, 40, 100 + i * 14, 9)),
      ...main.map((text, i) => item(text, 230, 100 + i * 14)),
    ];
    expect(hasColumnGutter(groupRows(items), 612)).toBe(true);
  });

  it("allows a full-width name across the top", () => {
    const items = [
      item("Alexandra Morgan-Whitfield, Senior Product Engineer", 40, 60, 14),
      ...sidebar.map((text, i) => item(text, 40, 100 + i * 14, 9)),
      ...main.map((text, i) => item(text, 230, 100 + i * 14)),
    ];
    expect(hasColumnGutter(groupRows(items), 612)).toBe(true);
  });

  it("doesn't mistake right-aligned dates in a single column for a second column", () => {
    const items: LayoutItem[] = [];
    let baseline = 60;
    for (let job = 0; job < 3; job++) {
      items.push(item(`Engineer, Company ${job}`, 50, baseline), item("Jan 2020 - Present", 470, baseline));
      baseline += 14;
      for (let line = 0; line < 4; line++) {
        items.push(item("• Built and ran a service that many teams across the company relied on", 50, baseline));
        baseline += 13;
      }
    }
    expect(hasColumnGutter(groupRows(items), 612)).toBe(false);
  });

  it("doesn't flag short bullets with right-aligned dates either", () => {
    const items: LayoutItem[] = [];
    let baseline = 60;
    const dates = ["Jan 2020 - Present", "Jun 2018 - Dec 2019", "Mar 2016 - May 2018", "2014 - 2016"];
    for (const [job, date] of dates.entries()) {
      items.push(item(`Engineer, Company ${job}`, 50, baseline));
      items.push(item(date, 562 - date.length * 5, baseline));
      items.push(item("• Shipped the billing service", 50, baseline + 13));
      baseline += 28;
    }
    expect(hasColumnGutter(groupRows(items), 612)).toBe(false);
  });

  it("doesn't decide anything from a handful of lines", () => {
    const items = [item("Left", 40, 100), item("Right", 300, 100), item("Left", 40, 114), item("Right", 300, 114)];
    expect(hasColumnGutter(groupRows(items), 612)).toBe(false);
  });
});
