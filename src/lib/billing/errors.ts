export type BillingErrorCode =
  | "unavailable"
  | "no_subscription"
  | "already_subscribed"
  | "refused"
  | "payment_overdue"
  | "provider_error";

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
