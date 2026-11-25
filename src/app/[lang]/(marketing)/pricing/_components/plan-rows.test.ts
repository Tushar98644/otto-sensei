import { describe, expect, it } from "vitest";
import { FEATURES, PLANS } from "@/config/plans";
import { formatFor } from "@/i18n/intl";
import { englishMessages } from "@/i18n/messages";
import { planRows as planRowsIn } from "./plan-rows";

const format = formatFor("en");
const planRows = () => planRowsIn(englishMessages().pricing.table, format);

describe("the plan table", () => {
  it("has one row per AI allowance, with the numbers from PLANS", () => {
    const [ai] = planRows();
    expect(ai?.rows).toHaveLength(FEATURES.length);
    FEATURES.forEach((feature, index) => {
      const row = ai?.rows[index];
      expect(row?.cells.pro).toBe(format.number(PLANS.pro.limits[feature]));
      expect(row?.cells.max).toBe(format.number(PLANS.max.limits[feature]));
      expect(row?.cells.free).toBe(
        PLANS.free.limits[feature] > 0 ? format.number(PLANS.free.limits[feature]) : false,
      );
    });
    expect(ai?.rows.find((row) => row.label === "Line fixes with Otto")?.cells).toEqual({
      free: "3",
      pro: "750",
      max: "2,000",
    });
  });

  it("lists the other allowances, never claiming unlimited use", () => {
    const rows = planRows().flatMap((group) => group.rows);
    const cells = (label: string) => rows.find((row) => row.label === label)?.cells;
    expect(cells("Resumes")).toEqual({ free: "1", pro: "25", max: "50" });
    expect(rows.find((row) => row.label === "Resumes")?.detail).toBe(
      "Tailored versions count as resumes",
    );
    expect(cells("Formats")).toEqual({ free: "2", pro: "All 6", max: "All 6" });
    expect(cells("Word (.docx) downloads")).toEqual({ free: false, pro: true, max: true });
    expect(cells("PDF downloads")).toEqual({ free: true, pro: true, max: true });
    expect(cells("Job matches")).toEqual({ free: "5 closest", pro: "All", max: "All" });
    expect(cells("Tracked applications")).toEqual({ free: "1", pro: "1,000", max: "2,000" });
    for (const row of rows) {
      expect(`${row.label} ${row.detail ?? ""} ${Object.values(row.cells).join(" ")}`).not.toMatch(
        /unlimited|fair use/i,
      );
    }
  });
});
