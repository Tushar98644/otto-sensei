"use client";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@/config/brand";
import { useMessagesOr } from "@/i18n/client";
import EN_UPGRADE from "@/i18n/messages/en/upgrade";
import { rich } from "@/i18n/rich";
import type { BillingMode } from "@/lib/billing/types";
import { SUPPORT_MAILTO } from "./copy";

export function BillingNote({ mode }: { mode: BillingMode | undefined }) {
  const t = useMessagesOr("upgrade", EN_UPGRADE).billing;
  if (mode === "mock") {
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Badge>{t.testMode}</Badge>
        {t.mockPlan}
      </p>
    );
  }
  if (mode === "disabled") {
    return (
      <Alert title={t.offTitle}>
        {rich(
          t.off,
          {
            link: (chunk) => (
              <a
                href={SUPPORT_MAILTO}
                className="font-medium break-all text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
              >
                {chunk}
              </a>
            ),
          },
          { email: BRAND.supportEmail },
        )}
      </Alert>
    );
  }
  return null;
}
