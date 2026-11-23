import type { Feature } from "@/config/plans";

// One line of the account's credit history; spends of a day and feature add up into one.
export type CreditEntry = {
  at: number;
  kind: "added" | "spent" | "taken_back";
  cents: number;
  feature: Feature | null;
  count: number;
};

// The checkout metadata key naming our record of a top-up checkout.
export const TOPUP_METADATA_KEY = "topup_id";
