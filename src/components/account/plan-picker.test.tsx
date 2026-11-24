import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SHOW_REFERENCE_PRICES, type BillingInterval } from "@/config/plans";
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
    expect(yearly).toContain("Pro $144/year");
    expect(yearly).toContain("Max $278/year");
    expect(yearly).not.toMatch(/month|Reference price/);
  });

  it("strikes a reference price through on monthly only, and only when switched on", () => {
    const monthly = text("month");
    const ref = (price: string) => (SHOW_REFERENCE_PRICES ? `Reference price ${price} ` : "");
    expect(monthly).toContain(`Pro ${ref("$30")}$15/month`);
    expect(monthly).toContain(`Max ${ref("$60")}$29/month`);
  });

  it("shows monthly for a plan not sold at the picked option", () => {
    const yearly = text("year", { pro: ["month", "year"], max: ["month"] });
    expect(yearly).toContain("Pro $144/year");
    expect(yearly).toContain(
      SHOW_REFERENCE_PRICES ? "Max Reference price $60 $29/month" : "Max $29/month",
    );
  });
});
