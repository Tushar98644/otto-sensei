import { describe, expect, it, vi } from "vitest";
import { BRAND } from "@/config/brand";
import { BillingError, type BillingErrorDetails, type BillingRefusalReason } from "@/lib/billing";
import { billingFailure, CHANGE_NOT_OFFERED_MESSAGE } from "./shared";

type Action = "checkout" | "portal";

async function answer(error: unknown, action: Action = "checkout") {
  const res = billingFailure(error, action);
  const body = (await res.json()) as { error: { code: string; message: string } };
  return { status: res.status, ...body.error };
}

const refused = (details: BillingErrorDetails) =>
  new BillingError("refused", "The provider refused", details);

const EMAIL_US = `our payment provider turned the request down. Email us at ${BRAND.supportEmail} and we'll sort it out.`;
const ALREADY = { status: 400, code: "bad_request", message: "You're already on that plan." };

// Every reason is listed, so a new one fails to compile until it has its own copy.
const PLAN_CHANGE_COPY: Record<BillingRefusalReason, { status: number; message: string }> = {
  busy: {
    status: 409,
    message:
      "We couldn't change your plan: your subscription is busy with a renewal or another change. Try again in a little while.",
  },
  inactive: {
    status: 409,
    message:
      "We couldn't change your plan: your subscription isn't active right now. Refresh the page and try again.",
  },
  declined: {
    status: 409,
    message:
      "We couldn't change your plan: your card was declined. Update your card in Manage billing, then try again.",
  },
  misconfigured: {
    status: 502,
    message:
      "We couldn't change your plan: payments aren't set up right on our side. Please try again later.",
  },
  not_found: {
    status: 409,
    message:
      "We couldn't change your plan: we couldn't find your subscription. Refresh the page and try again.",
  },
  rate_limited: {
    status: 503,
    message:
      "We couldn't change your plan: our payment provider is busy. Please try again in a minute.",
  },
  has_subscription: ALREADY,
};

describe("billingFailure for a refused request", () => {
  it.each(Object.entries(PLAN_CHANGE_COPY))(
    "words a refused plan change by its reason: %s",
    async (reason, expected) => {
      const result = await answer(
        refused({
          operation: "change_plan",
          providerStatus: 409,
          reason: reason as BillingRefusalReason,
        }),
      );
      expect(result).toEqual({
        code: reason === "has_subscription" ? "bad_request" : "plan_change_failed",
        ...expected,
      });
      expect(result.message).not.toContain("reach");
      if (reason !== "has_subscription") expect(result.message).not.toContain("Email us");
    },
  );

  it("asks the user to email us when the provider gives no reason we know", async () => {
    expect(await answer(refused({ operation: "change_plan", providerStatus: 422 }))).toEqual({
      status: 409,
      code: "plan_change_failed",
      message: `We couldn't change your plan: ${EMAIL_US}`,
    });
    expect(await answer(refused({ operation: "checkout", providerStatus: 400 }))).toEqual({
      status: 409,
      code: "billing_unavailable",
      message: `We couldn't start checkout: ${EMAIL_US}`,
    });
  });

  it("goes by the neutral reason only, never by a provider's own code or status", async () => {
    for (const providerCode of [
      "subscription_locked_renewal",
      "subscription_update_when_canceled",
      "subscription_payment_declined",
      "transaction_default_checkout_url_not_set",
    ]) {
      expect(
        (await answer(refused({ operation: "change_plan", providerStatus: 400, providerCode })))
          .message,
      ).toBe(`We couldn't change your plan: ${EMAIL_US}`);
    }
    expect(
      await answer(
        refused({
          operation: "change_plan",
          providerStatus: 400,
          providerCode: "pending_plan_change_exists",
          reason: "busy",
        }),
      ),
    ).toEqual({ code: "plan_change_failed", ...PLAN_CHANGE_COPY.busy });
  });

  it("starts the sentence with what the user was doing", async () => {
    expect(
      await answer(
        refused({ operation: "checkout", providerStatus: 401, reason: "misconfigured" }),
      ),
    ).toEqual({
      status: 502,
      code: "billing_unavailable",
      message:
        "We couldn't start checkout: payments aren't set up right on our side. Please try again later.",
    });
    expect(
      await answer(
        refused({ operation: "portal", providerStatus: 429, reason: "rate_limited" }),
        "portal",
      ),
    ).toEqual({
      status: 503,
      code: "billing_unavailable",
      message:
        "We couldn't open billing: our payment provider is busy. Please try again in a minute.",
    });
    expect(
      await answer(refused({ operation: "checkout", providerStatus: 422, reason: "inactive" })),
    ).toEqual({
      status: 409,
      code: "billing_unavailable",
      message:
        "We couldn't start checkout: your subscription isn't active right now. Refresh the page and try again.",
    });
  });

  it("names what couldn't be found after the call that failed", async () => {
    const notFound = (operation: string) =>
      refused({ operation, providerStatus: 404, reason: "not_found" });
    expect((await answer(notFound("checkout"))).message).toBe(
      "We couldn't start checkout: that plan isn't on sale right now. Refresh the page and try again.",
    );
    expect((await answer(notFound("portal"), "portal")).message).toBe(
      "We couldn't open billing: we couldn't find your billing account. Refresh the page and try again.",
    );
    // An upgrade that ends in a billing link names the billing account, not the plan.
    expect((await answer(notFound("portal"), "checkout")).message).toBe(
      "We couldn't start checkout: we couldn't find your billing account. Refresh the page and try again.",
    );
    expect((await answer(notFound("lookup"), "portal")).message).toBe(
      "We couldn't open billing: we couldn't find your billing account. Refresh the page and try again.",
    );
  });

  it("answers a second subscription the provider caught like the one we catch ourselves", async () => {
    const ours = await answer(new BillingError("already_subscribed", "already on pro"));
    expect(ours).toEqual(ALREADY);
    expect(
      await answer(
        refused({ operation: "checkout", providerStatus: 409, reason: "has_subscription" }),
      ),
    ).toEqual(ours);
  });
});

describe("billingFailure for other billing errors", () => {
  it('keeps "couldn\'t reach" for network and 5xx failures only', async () => {
    expect(
      await answer(new BillingError("provider_error", "Dodo change_plan request failed")),
    ).toEqual({
      status: 503,
      code: "billing_unavailable",
      message: "We couldn't reach our payment provider. Please try again in a minute.",
    });
  });

  it("says payments aren't on yet when billing isn't configured", async () => {
    expect(await answer(new BillingError("unavailable", "not configured"))).toEqual({
      status: 503,
      code: "billing_unavailable",
      message: "Payments aren't available yet. Please try again later.",
    });
  });

  it("says when there's nothing to manage", async () => {
    expect(await answer(new BillingError("no_subscription", "none"), "portal")).toEqual({
      status: 400,
      code: "bad_request",
      message: "You don't have a subscription to manage yet.",
    });
  });

  it("tells someone whose renewal failed to fix the card first", async () => {
    expect(await answer(new BillingError("payment_overdue", "past due"))).toEqual({
      status: 409,
      code: "plan_change_failed",
      message:
        "We couldn't change your plan: your last payment didn't go through. Update your card in Manage billing, then try again.",
    });
  });

  it("explains that only Pro to Max on the same billing period changes in the app", async () => {
    expect(await answer(new BillingError("change_not_offered", "max to pro"))).toEqual({
      status: 409,
      code: "plan_change_failed",
      message: CHANGE_NOT_OFFERED_MESSAGE,
    });
  });

  it("hides anything that isn't a billing error behind a plain 500, and logs it", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await answer(new Error("socket hang up at /srv/otto/secrets"), "portal");
    expect(result).toEqual({
      status: 500,
      code: "server_error",
      message: "Something went wrong. Please try again.",
    });
    expect(JSON.stringify(errors.mock.calls)).toContain("billing.portal_failed");
    errors.mockRestore();
  });
});
