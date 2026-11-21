"use client";

import { TriangleExclamationPoint } from "lucide-react";
import { useBillingRedirect } from "@/components/account/use-billing-redirect";
import { Button } from "@/components/ui/button";
import type { PlanSlip } from "./plan-slip";

// A trial's days left ride on the account row's plan line, so only the offer and a failed payment show here.
export function SidebarPlan({
  slip,
  onUpgrade,
}: {
  slip: PlanSlip | null;
  onUpgrade: () => void;
}) {
  const portal = useBillingRedirect("portal");
  if (!slip || slip.kind === "trial") return null;

  if (slip.kind === "offer") {
    return (
      <Button variant="secondary" size="sm" onClick={onUpgrade} className="w-full">
        {slip.label}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-warn-soft p-3">
      <p className="flex items-start gap-2 text-sm/5 font-medium text-warn-ink">
        <TriangleExclamationPoint aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
        Your last payment didn&apos;t go through
      </p>
      <Button
        variant="secondary"
        size="sm"
        loading={portal.pending}
        onClick={() => void portal.go()}
        className="w-full"
      >
        {slip.label}
      </Button>
    </div>
  );
}
