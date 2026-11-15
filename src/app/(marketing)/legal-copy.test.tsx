import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JOB_COUNTS_FALLBACK } from "@/lib/job-feed/counts";
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

const MERCHANT_OF_RECORD =
  "Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders.";
const PADDLE_REFUND_POLICY = "https://paddle.com/legal/refund-policy";
const NO_REFUND_WORDING =
  /no refunds|all sales are final|aren't refunded|non-refundable|money-back/i;

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

describe("legal pages under Paddle", () => {
  it("never name the old payment provider", async () => {
    const pricing = renderToStaticMarkup(await PricingPage());
    for (const html of [terms, refunds, privacy, pricing]) expect(text(html)).not.toMatch(/creem/i);
  });

  it("terms carry Paddle's merchant-of-record sentence and link its refund policy", () => {
    expect(text(terms)).toContain(MERCHANT_OF_RECORD);
    expect(hrefs(terms)).toContain(PADDLE_REFUND_POLICY);
    expect(hrefs(terms)).toContain("/refunds");
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

  it("the refund page defers to Paddle's buyer refund policy and promises nothing of its own", () => {
    const body = text(refunds);
    expect(body).toContain(MERCHANT_OF_RECORD);
    expect(body).toContain("Refund requests are handled by Paddle under its buyer refund policy.");
    expect(hrefs(refunds)).toContain(PADDLE_REFUND_POLICY);
    expect(body).not.toMatch(NO_REFUND_WORDING);
    expect(body).not.toMatch(/guarantee|within \d+ days/i);
    expect(String(refundsMetadata.description)).not.toMatch(NO_REFUND_WORDING);
    expect(String(refundsMetadata.description)).toContain("Paddle, our merchant of record");
  });

  it("the refund page keeps cancelling, the trial and account deletion as they were", () => {
    const body = text(refunds);
    expect(body).toContain("You keep your plan until the end of the period you've paid for");
    expect(body).toContain("Cancel before the trial ends and you won't pay anything");
    expect(body).toContain("Deleting your account cancels your paid plan right away");
    expect(body).toContain("rather than at the end of the period you've paid for");
  });

  it("privacy lists Paddle as the payment processor and says what it sends us", () => {
    const body = text(privacy);
    expect(body).toContain("Paddle processes payments as our merchant of record");
    expect(body).toContain("the subscription details Paddle sends us");
    expect(body).toContain("What we send Paddle:");
    expect(body).toContain("What Paddle sends us:");
    expect(body).toContain("Paddle never sends us your full card number.");
    expect(body).toContain("which we don't store");
    expect(body).toMatch(/Paddle's checkout, only on the checkout page, may set its own cookies/);
    expect(hrefs(privacy)).toContain("https://www.paddle.com/legal/privacy");
  });

  it("privacy keeps the account deletion promise", () => {
    expect(text(privacy)).toContain(
      "Deleting your account cancels your paid plan or trial right away, and you won't be charged again.",
    );
  });
});

describe("pricing billing questions", () => {
  it("name Paddle as the merchant of record and send refunds to its policy, without a no", async () => {
    const body = text(renderToStaticMarkup(await PricingPage()));
    expect(body).toContain("Who handles payments? Paddle, our merchant of record.");
    expect(body).toContain(
      "Can I get a refund? Refund requests are handled by Paddle, our merchant of record, under its refund policy.",
    );
    expect(body).not.toMatch(NO_REFUND_WORDING);
    expect(body).not.toContain("Can I get a refund? No");
  });

  it("offer only Pro to Max on the same billing period, never money back", async () => {
    const body = text(renderToStaticMarkup(await PricingPage()));
    expect(body).toContain(
      "You can move up from Pro to Max on your account page, on the billing period you already have.",
    );
    expect(body).toContain("To move to Pro, or between monthly and yearly, cancel");
    expect(body).not.toMatch(/moving down|into credit|get back the difference|refunded/i);
  });
});
