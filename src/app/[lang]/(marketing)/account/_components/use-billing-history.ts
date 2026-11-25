"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Me } from "@/components/account/use-me";
import type { BillingHistory } from "@/lib/billing/history-types";
import { useAppQueryClient } from "@/lib/queries/client";
import { billingHistoryQuery } from "@/lib/queries/options";

export type BillingHistoryState = {
  status: "off" | "loading" | "ready" | "error";
  history: BillingHistory | null;
  retry: () => void;
};

export function useBillingHistory(me: Me): BillingHistoryState {
  const user = me.user;
  const client = useAppQueryClient();
  const planState = user
    ? [
        user.plan,
        user.planInterval,
        user.planRenewsAt,
        user.trialEndsAt,
        me.billing.paymentIssue,
        me.billing.cancelScheduled,
      ].join(":")
    : "";
  const enabled = user !== null && me.billing.mode !== "disabled";
  const query = useQuery(
    { ...billingHistoryQuery(user?.id ?? "", planState), enabled, retry: 1 },
    client,
  );
  const { refetch } = query;
  const retry = useCallback(() => void refetch(), [refetch]);
  if (!enabled) return { status: "off", history: null, retry };
  const status = query.data ? "ready" : query.isError ? "error" : "loading";
  return { status, history: query.data ?? null, retry };
}
