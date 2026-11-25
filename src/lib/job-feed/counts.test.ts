import { describe, expect, it } from "vitest";
import { planCopy, proTools } from "@/app/[lang]/(marketing)/_components/plan-features";
import { formatFor } from "@/i18n/intl";
import { englishMessages } from "@/i18n/messages";
import { countClaim, countClaimWith, JOB_COUNTS_FALLBACK } from "./counts";

const EN = englishMessages().pricing;
const FORMAT = formatFor("en");

describe("countClaim", () => {
  it("rounds down, so the claim stays true", () => {
    expect(countClaim(27_833)).toBe("27,000+");
    expect(countClaim(1_000)).toBe("1,000+");
    expect(countClaim(999)).toBe("900+");
    expect(countClaim(150)).toBe("100+");
  });

  it("states no number when there are too few, or none could be read", () => {
    expect(countClaim(99)).toBeNull();
    expect(countClaim(0)).toBeNull();
    expect(countClaim(Number.NaN)).toBeNull();
  });

  it("writes the same claim in the page's language", () => {
    expect(countClaimWith(FORMAT.number, 27_833)).toBe(countClaim(27_833));
    expect(countClaimWith(formatFor("de").number, 27_833)).toBe("27.000+");
    expect(countClaimWith(formatFor("de").number, 99)).toBeNull();
  });
});

describe("the plans' jobs line", () => {
  it("uses the same live open-job count as the home page", () => {
    expect(proTools(EN, FORMAT, { open: 27_833, matchable: 21_456 })).toContain(
      "Every match from 27,000+ open jobs, with filters and saved jobs",
    );
    expect(
      planCopy(EN, FORMAT, "pro", "month", { open: 27_833, matchable: 21_456 }).features.join(" "),
    ).toMatch(/27,000\+ open jobs/);
  });

  it("falls back to the measured floor, and to no number at all with too few jobs", () => {
    expect(proTools(EN, FORMAT, JOB_COUNTS_FALLBACK)).toContain(
      "Every match from 35,000+ open jobs, with filters and saved jobs",
    );
    expect(proTools(EN, FORMAT, { open: 40, matchable: 12 })).toContain(
      "Open jobs matched to your resume, with filters and saved jobs",
    );
  });
});
