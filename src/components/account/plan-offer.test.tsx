import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PRICES_USD, type BillingInterval, type PlanId } from "@/config/plans";
import { perMonth, yearlySavingsPercent } from "@/lib/billing/prices";
import { PlanOffer } from "./plan-offer";
import { upgradeOffer, type Offer } from "./upgrade-offer";

const ALL: Offer = { pro: ["month", "year"], max: ["month", "year"] };
const usd = (amount: number) => `$${amount}`;

function render(
  current: PlanId,
  picked: BillingInterval,
  {
    offer = ALL,
    trial = false,
    buy = true,
    onTrial = false,
  }: { offer?: Offer; trial?: boolean; buy?: boolean; onTrial?: boolean } = {},
) {
  const { cards, intervals, interval } = upgradeOffer({ current, offer, picked, trial, onTrial });
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
  it("on the Pro trial, says Max ends the trial today and at what price, before the click", () => {
    const monthly = render("pro", "month", { onTrial: true }).text;
    expect(monthly).toContain("Start Max now");
    expect(monthly).toContain(
      `Ends your Pro trial today and starts Max at ${usd(PRICES_USD.max.month)}/month.`,
    );
    expect(monthly).not.toContain("Upgrade to Max");
    expect(render("pro", "year", { onTrial: true }).text).toContain(
      `starts Max at ${usd(PRICES_USD.max.year)}/year.`,
    );
    expect(render("pro", "month").text).toContain("Upgrade to Max");
  });

  it("shows Free both plans for the picked option, Pro most popular with the trial", () => {
    const { text, html } = render("free", "month", { trial: true });
    expect(text).toContain(`Pro Popular ${usd(PRICES_USD.pro.month)} /month per month`);
    expect(text).toContain(`Max ${usd(PRICES_USD.max.month)} /month per month`);
    expect(text).toContain("Try Pro for 7 days");
    expect(text).toContain(`$1 for 7 days, then ${usd(PRICES_USD.pro.month)} a month.`);
    expect(text).not.toMatch(/free for|try pro free/i);
    expect(text).toContain("Upgrade to Max");
    expect(text).toContain("Everything in Pro, with more:");
    expect(text).toContain("Up to 25 resumes and 1,000 tracked applications");
    expect(text).toContain("Up to 50 resumes and 2,000 tracked applications");
    expect(html.match(/data-autofocus/g)).toHaveLength(1);
  });

  it("follows the picked billing option: yearly prices and savings, no trial", () => {
    const { text } = render("free", "year", { trial: true });
    expect(text).toContain(`Pro Popular ${usd(PRICES_USD.pro.year)} /year per year`);
    expect(text).toContain(`Max ${usd(PRICES_USD.max.year)} /year per year`);
    expect(text).toContain(`Save ${yearlySavingsPercent("pro")}%`);
    expect(text).toContain(`About ${perMonth("max")} a month.`);
    expect(text).not.toContain("Try Pro for");
    expect(text).toContain("Upgrade to Pro");
    expect(text).toContain("Limits reset each month, on the day of the month your plan started.");
    expect(text).toContain("150 tailored versions a month");
    expect(text).not.toMatch(/weekly|\/week|a week/i);
  });

  it("shows Pro its plan as current, with Max to buy", () => {
    const { text } = render("pro", "month");
    expect(text).toContain("Pro Current plan");
    expect(text).not.toContain("Upgrade to Pro");
    expect(text).not.toContain("Popular");
    expect(text).toContain("Upgrade to Max");
  });

  it("lists only billing options on sale, and says when a plan is sold monthly only", () => {
    const { text } = render("free", "year", { offer: { pro: ["month"], max: ["month", "year"] } });
    expect(text).toContain("Monthly");
    expect(text).toContain("Yearly");
    expect(text).not.toContain("Weekly");
    expect(text).toContain(`Pro Popular ${usd(PRICES_USD.pro.month)} /month`);
    expect(text).toContain("Sold monthly only, for now.");
    expect(text).toContain(`Max ${usd(PRICES_USD.max.year)} /year`);

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
