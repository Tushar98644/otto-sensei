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

/** Never holds customer data. */
export type BillingErrorDetails = {
  operation?: string;
  providerStatus?: number;
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
