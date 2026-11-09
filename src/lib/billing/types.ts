// Client-safe.
// creem: real checkout. mock: development only, "Upgrade" flips the plan locally. disabled:
// production without billing keys, so upgrade buttons explain that payments aren't live yet.
export type BillingMode = "creem" | "mock" | "disabled";
