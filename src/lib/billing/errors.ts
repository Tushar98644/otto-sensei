// Server-only. Routes map each code to a plain message for the user.

export type BillingErrorCode =
  | "unavailable"
  | "no_subscription"
  | "already_subscribed"
  // Creem answered and turned the request down (a 4xx): nothing changed. Not a network problem.
  | "refused"
  // The subscription's last payment failed, so its plan can't change until the card is fixed.
  | "payment_overdue"
  // Creem couldn't be reached, timed out, failed (5xx) or answered with something unreadable.
  | "provider_error";

/** What Creem said when it refused, for the route's message. Never holds customer data. */
export type BillingErrorDetails = {
  /** Which call it refused, e.g. "change_plan" or "checkout". */
  operation?: string;
  /** Creem's HTTP status. */
  providerStatus?: number;
  /** Creem's error code, e.g. "subscription_not_active", when its body had one. */
  providerCode?: string;
};

export class BillingError extends Error {
  readonly code: BillingErrorCode;
  readonly details: BillingErrorDetails;

  constructor(code: BillingErrorCode, message: string, details: BillingErrorDetails = {}) {
    super(message);
    this.name = "BillingError";
    this.code = code;
    this.details = details;
  }
}
