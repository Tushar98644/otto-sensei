import { describe, expect, it } from "vitest";
import { bestMetric, compactNumber, metricsIn, metricText, topMetrics } from "./metrics";

const best = (line: string) => {
  const metric = bestMetric([line]);
  return metric ? metricText(metric) : null;
};

describe("numbers pulled out of resume lines", () => {
  it("turns a percent with a direction into a signed highlight", () => {
    expect(
      best(
        "Rebuilt the payouts pipeline on Postgres and SQS; failed payouts fell 72% at 1.4M payouts a month.",
      ),
    ).toBe("-72% failed payouts");
    expect(best("Raised booking conversion 11% with an A/B-tested checkout.")).toBe(
      "+11% booking conversion",
    );
    expect(best("Cut load time by 40%")).toBe("-40% load time");
  });

  it("reads from-to as a before and after", () => {
    expect(
      best("Cut dashboard p95 load from 3.1s to 0.9s with streamed rendering and batched queries."),
    ).toBe("3.1s → 0.9s dashboard p95 load");
    expect(best("Cut p95 dashboard load from 3.8 s to 0.9 s with materialized views.")).toBe(
      "3.8s → 0.9s p95 dashboard load",
    );
  });

  it("keeps counts with what they count, rates included", () => {
    expect(
      best("Shipped an offline-first editor used by 300K people a month (React, IndexedDB)."),
    ).toBe("300K people a month");
    expect(
      best("Built the carrier-rate API, quoting 1.2M shipments a month across 9 carriers."),
    ).toBe("1.2M shipments a month");
    expect(best("4,800 business accounts now get invoices in under 2 minutes.")).toBe(
      "4,800 business accounts",
    );
    expect(best("Built 20+ client sites on a shared component library.")).toBe("20+ client sites");
  });

  it("reads money and multiples", () => {
    expect(best("Grew MRR to $3.1K with 140 paying venues")).toBe("$3.1K MRR");
    expect(best("Reduced AWS costs by $12K a year")).toBe("$12K AWS costs a year");
    expect(best("Made the build 3x faster in 2023")).toBe("3x faster");
  });

  it("says nothing when there is no clear number", () => {
    expect(best("Mentor four engineers and run the team's RFC process.")).toBeNull();
    expect(best("Merged six services behind one GraphQL gateway.")).toBeNull();
    // Years, versions and percentiles are not results.
    expect(metricsIn("Joined in 2019 and moved the app to Node 18 and p95 alerts")).toEqual([]);
    expect(metricsIn("")).toEqual([]);
  });

  it("ranks a change above a count and picks different numbers for an outcome line", () => {
    const line = "Failed payouts fell 72% at 1.4M payouts a month.";
    expect(metricsIn(line).map((metric) => metric.kind)).toEqual(["change", "count"]);
    expect(
      topMetrics([line, "Used by 300K people a month"], 3).map((metric) => metric.value),
    ).toEqual(["-72%", "1.4M", "300K"]);
  });

  it("writes big numbers short", () => {
    expect(compactNumber(4_200)).toBe("4.2k");
    expect(compactNumber(950)).toBe("950");
    expect(compactNumber(1_400_000)).toBe("1.4M");
    expect(compactNumber(123_456)).toBe("123k");
  });
});
