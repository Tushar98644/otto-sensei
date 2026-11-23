"use client";

import { toast } from "@/components/ui/toast";
import { centsText } from "@/config/topup";
import type { CreditNote } from "@/lib/api/types";
import { refreshMe } from "./use-me";

// The quiet note after an action paid from the balance.
export function showCreditSpent({ cents, balanceCents }: CreditNote): void {
  toast({
    title: `${centsText(cents)} from your balance`,
    description: balanceCents > 0 ? `${centsText(balanceCents)} left.` : "That was the last of it.",
  });
  void refreshMe();
}
