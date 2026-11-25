// Dodo Payments resells every order as merchant of record; the disclosure stays in draft until Dodo compliance approves it (MSA 2.1).
export const MERCHANT = {
  name: "Dodo Payments",
  disclosure:
    "Our order process is conducted by our online reseller Dodo Payments, the merchant of record for all our orders. Dodo Payments handles payment, receipts, sales tax or VAT, refunds and billing support.",
  buyerTermsUrl: "https://dodopayments.com/legal/buyer-terms",
  privacyUrl: "https://dodopayments.com/legal/privacy-policy",
  buyerHelpUrl: "https://dodopayments.com/support/why-has-dodo-payments-charged-me",
  statementPrefix: "DODOPAY",
} as const;
