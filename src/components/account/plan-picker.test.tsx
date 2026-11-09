import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BillingInterval } from "@/config/plans";
import { PlanPicker } from "./plan-picker";

const text = (interval: BillingInterval, offer?: Parameters<typeof PlanPicker>[0]["offer"]) =>
  renderToStaticMarkup(
    <PlanPicker
      plans={["pro", "max"]}
      value="pro"
      onChange={() => {}}
      interval={interval}
      offer={offer}
    />,
  )
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

describe("PlanPicker", () => {
  it("prices each plan for the picked billing option, not a fixed month", () => {
    const yearly = text("year");
    expect(yearly).toContain("Pro $120/year");
    expect(yearly).toContain("Max $232/year");
    expect(yearly).not.toMatch(/month|Reference price/);

    const weekly = text("week");
    expect(weekly).toContain("Pro $6/week");
    expect(weekly).toContain("Max $12/week");
    expect(weekly).not.toMatch(/Reference price/);
  });

  it("strikes the reference price through on monthly only", () => {
    const monthly = text("month");
    expect(monthly).toContain("Pro Reference price $30 $15/month");
    expect(monthly).toContain("Max Reference price $60 $29/month");
  });

  it("shows monthly for a plan not sold at the picked option", () => {
    const weekly = text("week", { pro: ["month", "week"], max: ["month"] });
    expect(weekly).toContain("Pro $6/week");
    expect(weekly).toContain("Max Reference price $60 $29/month");
  });
});
