// Server-only. Routes map each code to a plain message for the user.

export type BillingErrorCode =
  | "unavailable"
  | "no_subscription"
  | "already_subscribed"
  | "provider_error";

export class BillingError extends Error {
  readonly code: BillingErrorCode;

  constructor(code: BillingErrorCode, message: string) {
    super(message);
    this.name = "BillingError";
    this.code = code;
  }
}
