import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PRO_TRIAL } from "@/config/plans";
import { JOB_COUNTS_FALLBACK } from "@/lib/job-feed/counts";
import { MERCHANT } from "./_components/merchant";
import AcceptableUsePage from "./acceptable-use/page";
import PricingPage from "./pricing/page";
import PrivacyPage from "./privacy/page";
import RefundsPage, { metadata as refundsMetadata } from "./refunds/page";
import TermsPage from "./terms/page";

vi.mock("next/font/google", () => {
  const font = () => () => ({ className: "face", variable: "", style: { fontFamily: "serif" } });
  return { Inter: font(), EB_Garamond: font() };
});

vi.mock("@/lib/job-feed/live-counts", () => ({
  loadJobCounts: async () => JOB_COUNTS_FALLBACK,
}));

const DISCLOSURE =
  "Our order process is conducted by our online reseller Dodo Payments, the merchant of record for all our orders. Dodo Payments handles payment, receipts, sales tax or VAT, refunds and billing support.";
const BUYER_TERMS = "https://dodopayments.com/legal/buyer-terms";
const DODO_PRIVACY = "https://dodopayments.com/legal/privacy-policy";
const BUYER_HELP = "https://dodopayments.com/support/why-has-dodo-payments-charged-me";
const NO_REFUND_WORDING =
  /no refunds|all sales are final|aren't refunded|non-refundable|money-back/i;
const OLD_PROVIDERS = /paddle|creem/i;

const decode = (html: string) =>
  html
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
const text = (html: string) =>
  decode(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .replace(/ ([.,:;])/g, "$1");
const hrefs = (html: string) =>
  [...html.matchAll(/href="([^"]+)"/g)].map((match) => decode(match[1]!));

const terms = renderToStaticMarkup(<TermsPage />);
const refunds = renderToStaticMarkup(<RefundsPage />);
const privacy = renderToStaticMarkup(<PrivacyPage />);
const acceptableUse = renderToStaticMarkup(<AcceptableUsePage />);
const pricingHtml = async () => renderToStaticMarkup(await PricingPage());

const trialFee = `$${PRO_TRIAL.priceUsd}`;

describe("the merchant of record", () => {
  it("is Dodo Payments, with the draft disclosure and its buyer pages", () => {
    expect(MERCHANT.name).toBe("Dodo Payments");
    expect(MERCHANT.disclosure).toBe(DISCLOSURE);
    expect(MERCHANT.buyerTermsUrl).toBe(BUYER_TERMS);
    expect(MERCHANT.privacyUrl).toBe(DODO_PRIVACY);
    expect(MERCHANT.buyerHelpUrl).toBe(BUYER_HELP);
  });
});

describe("legal pages under Dodo Payments", () => {
  it("never name an old payment provider, in text or links", async () => {
    const pricing = await pricingHtml();
    for (const html of [terms, refunds, privacy, acceptableUse, pricing]) {
      expect(text(html)).not.toMatch(OLD_PROVIDERS);
      expect(hrefs(html).join(" ")).not.toMatch(OLD_PROVIDERS);
    }
    expect(String(refundsMetadata.description)).not.toMatch(OLD_PROVIDERS);
  });

  it("terms, refunds and privacy carry the merchant-of-record disclosure", () => {
    for (const html of [terms, refunds, privacy]) expect(text(html)).toContain(DISCLOSURE);
  });

  it("terms name Otto Sensei as the seller and send refunds to Dodo's buyer terms", () => {
    const body = text(terms);
    expect(body).toContain("Otto Sensei is the business that runs this site and sells its plans");
    expect(body).toContain("Its buyer terms also apply to the purchase.");
    expect(body).toContain("Refund requests are handled by Dodo Payments under its buyer terms.");
    expect(hrefs(terms)).toContain(BUYER_TERMS);
    expect(hrefs(terms)).toContain("/refunds");
  });

  it("terms keep the USD price plus tax and the paid trial", () => {
    const body = text(terms);
    expect(body).toContain("Prices are in US dollars, plus any taxes where you live.");
    expect(body).toContain(
      `New accounts can have a ${PRO_TRIAL.days}-day Pro trial for ${trialFee}, once per person.`,
    );
    expect(body).toContain(`the ${trialFee} (plus any taxes) is charged when the trial starts`);
  });

  it("terms keep cancel anytime, with the plan kept to the end of the paid period", () => {
    expect(text(terms)).toContain("Cancel anytime from your account page");
    expect(text(terms)).toContain("you keep it until the end of the period you paid for");
  });

  it("terms offer only Pro to Max on the same billing period, never money paid back", () => {
    const body = text(terms);
    expect(body).toContain(
      "You can move up from Pro to Max on the billing period you already have",
    );
    expect(body).toContain("the difference for the rest of the period is charged right away");
    expect(body).toContain("To move to Pro, or between monthly and yearly, cancel");
    expect(body).not.toMatch(/moving down|into credit|refunded|get back the difference/i);
  });

  it("terms say starting Max on the trial charges the full price now, with the trial fee kept", () => {
    expect(text(terms)).toContain(
      `During the Pro trial you can start Max instead: the trial ends at once, the full Max price for the period you pick (plus any taxes) is charged right away to your card on file, and the ${trialFee} trial charge isn't taken off.`,
    );
  });

  it("terms say a failed payment keeps the plan a few days, then moves to Free until the card is fixed", () => {
    const body = text(terms);
    expect(body).toContain(
      "If a payment fails when your plan renews or your trial ends, you keep the plan for a few days while the payment is tried again.",
    );
    expect(body).toContain(
      "If it still fails, your account moves to Free until you update your card from your account page and the payment goes through.",
    );
  });

  it("the refund page defers to Dodo's buyer terms and promises nothing of its own", () => {
    const body = text(refunds);
    expect(body).toContain("Refund requests are handled by Dodo Payments under its buyer terms.");
    expect(hrefs(refunds)).toContain(BUYER_TERMS);
    expect(hrefs(refunds)).toContain(BUYER_HELP);
    expect(body).toContain("emails you a receipt with a link to download your invoice");
    expect(body).not.toMatch(NO_REFUND_WORDING);
    expect(body).not.toMatch(/guarantee|within \d+ days|\d+-day (refund|money)/i);
    expect(String(refundsMetadata.description)).not.toMatch(NO_REFUND_WORDING);
    expect(String(refundsMetadata.description)).toContain(
      "handled by Dodo Payments, our merchant of record, under its buyer terms",
    );
  });

  it("the refund page keeps cancelling, the trial and account deletion as they were", () => {
    const body = text(refunds);
    expect(body).toContain("You keep your plan until the end of the period you've paid for");
    expect(body).toContain("Cancel before the trial ends and you won't pay anything");
    expect(body).toContain("Deleting your account cancels your paid plan right away");
    expect(body).toContain("rather than at the end of the period you've paid for");
  });

  it("the refund page says starting Max on the trial charges the full price, the trial fee kept", () => {
    expect(text(refunds)).toContain(
      `If you start Max during the trial, the full Max price is charged right away and the ${trialFee} trial charge isn't taken off.`,
    );
  });

  it("privacy lists Dodo Payments as the payment processor and says what flows each way", () => {
    const body = text(privacy);
    expect(body).toContain("Dodo Payments processes payments as our merchant of record");
    expect(body).toContain("the subscription details Dodo Payments sends us");
    expect(body).toContain("What we send Dodo Payments:");
    expect(body).toContain("we also look up that email at Dodo Payments");
    expect(body).toContain("What Dodo Payments sends us:");
    expect(body).toContain("collects your payment details and billing address");
    expect(body).toContain("the card's network and last four digits");
    expect(body).toContain("we don't store any of these");
    expect(body).toContain("Dodo Payments never sends us your full card number.");
    expect(hrefs(privacy)).toContain(DODO_PRIVACY);
  });

  it("privacy says checkout and its cookies live on Dodo's site, not ours", () => {
    const body = text(privacy);
    expect(body).toContain("Checkout happens on the Dodo Payments site, not ours.");
    expect(body).toContain(
      "The Dodo Payments checkout runs on its own site, which may set its own cookies there",
    );
    expect(body).toContain("Our site sets no payment cookies.");
    expect(body).not.toMatch(/Payments's/);
  });

  it("privacy keeps the account deletion promise and the notice before changes", () => {
    const body = text(privacy);
    expect(body).toContain(
      "Deleting your account cancels your paid plan or trial right away, and you won't be charged again.",
    );
    expect(body).toContain("we'll email signed-in users before it takes effect");
  });
});

describe("pricing billing questions", () => {
  it("name Dodo Payments as the merchant of record, with the statement name", async () => {
    const body = text(await pricingHtml());
    expect(body).toContain("Who handles payments? Dodo Payments, our merchant of record.");
    expect(body).toContain(
      "your card statement shows the charge under their name, starting with DODOPAY.",
    );
    expect(body).toContain("We never see your full card number.");
  });

  it("send refunds to Dodo's buyer terms, without a no", async () => {
    const html = await pricingHtml();
    const body = text(html);
    expect(body).toContain(
      "Can I get a refund? Refund requests are handled by Dodo Payments, our merchant of record, under its buyer terms.",
    );
    expect(hrefs(html)).toContain(BUYER_TERMS);
    expect(body).not.toMatch(NO_REFUND_WORDING);
    expect(body).not.toContain("Can I get a refund? No");
  });

  it("offer only Pro to Max on the same billing period, never money back", async () => {
    const body = text(await pricingHtml());
    expect(body).toContain(
      "You can move up from Pro to Max on your account page, on the billing period you already have.",
    );
    expect(body).toContain("To move to Pro, or between monthly and yearly, cancel");
    expect(body).not.toMatch(/moving down|into credit|get back the difference|refunded/i);
  });

  it("say starting Max on the trial charges the full price now, with the trial fee kept", async () => {
    const body = text(await pricingHtml());
    expect(body).toContain(
      `On the Pro trial, starting Max ends the trial and charges the full Max price (plus any tax) to your card on file right away; the ${trialFee} trial charge isn't taken off.`,
    );
    expect(body).toContain(`pay ${trialFee} (plus any tax) when the trial starts`);
  });
});
