import { describe, expect, it } from "vitest";
import { BillingError, type BillingErrorDetails } from "@/lib/billing";
import { billingFailure } from "./shared";

async function answer(error: unknown, action: "checkout" | "portal" = "checkout") {
  const res = billingFailure(error, action);
  const body = (await res.json()) as { error: { code: string; message: string } };
  return { status: res.status, ...body.error };
}

const refused = (details: BillingErrorDetails) =>
  new BillingError("refused", "Paddle refused", details);

describe("billingFailure", () => {
  it("explains a refused plan change in plain words, never as an outage", async () => {
    expect(
      await answer(
        refused({
          operation: "change_plan",
          providerStatus: 400,
          providerCode: "subscription_update_when_canceled",
        }),
      ),
    ).toEqual({
      status: 409,
      code: "plan_change_failed",
      message:
        "We couldn't change your plan: your subscription isn't active right now. Refresh the page and try again.",
    });
    const unknown = await answer(refused({ operation: "change_plan", providerStatus: 422 }));
    expect(unknown).toMatchObject({ status: 409, code: "plan_change_failed" });
    expect(unknown.message).toMatch(
      /^We couldn't change your plan: our payment provider turned the request down\. Email us at \S+@\S+/,
    );
    expect(unknown.message).not.toContain("reach");
  });

  it("names Paddle's busy subscriptions and declined cards in plain words", async () => {
    expect(
      await answer(
        refused({ operation: "change_plan", providerStatus: 400, providerCode: "subscription_locked_renewal" }),
      ),
    ).toEqual({
      status: 409,
      code: "plan_change_failed",
      message:
        "We couldn't change your plan: your subscription is busy with a renewal or another change. Try again in a little while.",
    });
    expect(
      await answer(
        refused({ operation: "change_plan", providerStatus: 400, providerCode: "subscription_update_when_past_due" }),
      ),
    ).toMatchObject({ status: 409, code: "plan_change_failed" });
    expect(
      (
        await answer(
          refused({ operation: "change_plan", providerStatus: 400, providerCode: "subscription_payment_declined" }),
        )
      ).message,
    ).toBe(
      "We couldn't change your plan: your card was declined for the difference. Update your card in Manage billing, then try again.",
    );
    expect(
      await answer(
        refused({ operation: "checkout", providerStatus: 400, providerCode: "transaction_default_checkout_url_not_set" }),
      ),
    ).toEqual({
      status: 502,
      code: "billing_unavailable",
      message: "We couldn't start checkout: payments aren't set up right on our side. Please try again later.",
    });
  });

  it("names our side for auth errors and asks for a minute when Paddle is rate limiting", async () => {
    expect(await answer(refused({ operation: "change_plan", providerStatus: 401 }))).toMatchObject({
      status: 502,
      message:
        "We couldn't change your plan: payments aren't set up right on our side. Please try again later.",
    });
    expect(await answer(refused({ operation: "checkout", providerStatus: 429 }))).toMatchObject({
      status: 503,
      code: "billing_unavailable",
      message:
        "We couldn't start checkout: our payment provider is busy. Please try again in a minute.",
    });
    expect(
      (await answer(refused({ operation: "portal", providerStatus: 404 }), "portal")).message,
    ).toBe(
      "We couldn't open billing: we couldn't find your billing account. Refresh the page and try again.",
    );
  });

  it('keeps "couldn\'t reach" for network and 5xx failures only', async () => {
    expect(
      await answer(new BillingError("provider_error", "Paddle change_plan request failed")),
    ).toEqual({
      status: 503,
      code: "billing_unavailable",
      message: "We couldn't reach our payment provider. Please try again in a minute.",
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
});
