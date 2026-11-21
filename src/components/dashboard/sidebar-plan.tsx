"use client";

import { Clock, TriangleExclamationPoint } from "lucide-react";
import Link from "next/link";
import { useBillingRedirect } from "@/components/account/use-billing-redirect";
import type { Me } from "@/components/account/use-me";
import { ROUTES } from "@/components/site/routes";
import { useNow } from "@/components/studio/use-now";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth/types";
import { planSlip } from "./plan-slip";

export function SidebarPlan({
  user,
  me,
  onUpgrade,
}: {
  user: SessionUser;
  me: Me | null;
  onUpgrade: () => void;
}) {
  const now = useNow();
  const portal = useBillingRedirect("portal");
  const slip = planSlip(user, me?.billing, now);
  if (!slip) return null;

  if (slip.kind === "offer") {
    return (
      <Button variant="secondary" size="sm" onClick={onUpgrade} className="w-full">
        {slip.label}
      </Button>
    );
  }

  if (slip.kind === "trial") {
    return (
      <p className="flex h-9 items-center gap-2.5 px-2.5 text-sm text-muted">
        <Clock aria-hidden className="size-4 shrink-0" />
        <span>
          {slip.label}
          <span aria-hidden> · </span>
          <Link
            href={`${ROUTES.dashboardAccount}#plan`}
            className="font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
          >
            Manage
            <span className="sr-only"> your trial</span>
          </Link>
        </span>
      </p>
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
