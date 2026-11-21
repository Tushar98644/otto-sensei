export type BillingErrorCode =
  | "unavailable"
  | "no_subscription"
  | "already_subscribed"
  | "change_not_offered"
  | "refused"
  | "payment_overdue"
  | "provider_error";

export type BillingRefusalReason =
  | "busy"
  | "inactive"
  | "declined"
  | "misconfigured"
  | "not_found"
  | "rate_limited"
  | "has_subscription";

export type BillingErrorDetails = {
  operation?: string;
  providerStatus?: number;
  providerCode?: string;
  reason?: BillingRefusalReason;
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
