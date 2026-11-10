import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PRICES_USD, type BillingInterval, type PlanId } from "@/config/plans";
import { perMonth, yearlySavingsPercent } from "@/lib/billing/prices";
import { PlanOffer } from "./plan-offer";
import { upgradeOffer, type Offer } from "./upgrade-offer";

const ALL: Offer = { pro: ["month", "year", "week"], max: ["month", "year", "week"] };
const usd = (amount: number) => `$${amount}`;

function render(
  current: PlanId,
  picked: BillingInterval,
  {
    offer = ALL,
    trial = false,
    buy = true,
  }: { offer?: Offer; trial?: boolean; buy?: boolean } = {},
) {
  const { cards, intervals, interval } = upgradeOffer({ current, offer, picked, trial });
  const html = renderToStaticMarkup(
    <PlanOffer
      cards={cards}
      intervals={intervals}
      interval={interval}
      onIntervalChange={() => {}}
      onChoose={buy ? () => {} : undefined}
      focusPlan={cards.find((card) => !card.current)?.plan}
    />,
  );
  return { html, text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") };
}

describe("PlanOffer", () => {
  it("shows Free both plans for the picked option, Pro most popular with the trial", () => {
    const { text, html } = render("free", "month", { trial: true });
    expect(text).toContain(`Pro Most popular ${usd(PRICES_USD.pro.month)} /month per month`);
    expect(text).toContain(`Max ${usd(PRICES_USD.max.month)} /month per month`);
    expect(text).toContain("Try Pro free for 3 days");
    expect(text).toContain(`Free for 3 days, then ${usd(PRICES_USD.pro.month)}/month.`);
    expect(text).toContain("Upgrade to Max");
    expect(text).toContain("Everything in Pro, with more:");
    // One button is focused when the dialog opens.
    expect(html.match(/data-autofocus/g)).toHaveLength(1);
  });

  it("follows the picked billing option: yearly prices and savings, no trial", () => {
    const { text } = render("free", "year", { trial: true });
    expect(text).toContain(`Pro Most popular ${usd(PRICES_USD.pro.year)} /year per year`);
    expect(text).toContain(`Max ${usd(PRICES_USD.max.year)} /year per year`);
    expect(text).toContain(`Save ${yearlySavingsPercent("pro")}%`);
    expect(text).toContain(`About ${perMonth("max")} a month.`);
    expect(text).not.toContain("Try Pro free");
    expect(text).toContain("Upgrade to Pro");
    expect(text).toContain("Limits reset each month, on the day of the month your plan started.");

    const weekly = render("free", "week").text;
    expect(weekly).toContain(`${usd(PRICES_USD.pro.week)} /week`);
    expect(weekly).toContain("15 tailored versions a week");
    expect(weekly).toContain("Limits reset each billing week, when the plan renews.");
  });

  it("shows Pro its plan as current, with Max to buy", () => {
    const { text } = render("pro", "month");
    expect(text).toContain("Pro Current plan");
    expect(text).not.toContain("Upgrade to Pro");
    expect(text).not.toContain("Most popular");
    expect(text).toContain("Upgrade to Max");
  });

  it("lists only billing options on sale, and says when a plan is sold monthly only", () => {
    const { text } = render("free", "year", { offer: { pro: ["month"], max: ["month", "year"] } });
    expect(text).toContain("Monthly");
    expect(text).toContain("Yearly");
    expect(text).not.toContain("Weekly");
    expect(text).toContain(`Pro Most popular ${usd(PRICES_USD.pro.month)} /month`);
    expect(text).toContain("Sold monthly only, for now.");
    expect(text).toContain(`Max ${usd(PRICES_USD.max.year)} /year`);

    // One option on sale: nothing to pick.
    expect(
      render("free", "month", { offer: { pro: ["month"], max: ["month"] } }).text,
    ).not.toContain("How often to pay");
  });

  it("says when limits reset and keeps the two promises, never the 1st", () => {
    const { text } = render("free", "month");
    expect(text).toContain(
      "Limits reset each month, when your plan renews. Uploads always work, read by the basic reader past the AI reads. PDF downloads stay free on every plan.",
    );
    expect(text).not.toContain("1st");
  });

  it("has no buttons while payments are off", () => {
    const { html } = render("free", "month", { buy: false });
    expect(html).not.toContain("<button");
  });
});
