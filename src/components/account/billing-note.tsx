import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@/config/brand";
import type { BillingMode } from "@/lib/billing/types";
import { SUPPORT_MAILTO } from "./copy";

export function BillingNote({ mode }: { mode: BillingMode | undefined }) {
  if (mode === "mock") {
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Badge>Test mode</Badge>
        No real payment. Your plan switches right away.
      </p>
    );
  }
  if (mode === "disabled") {
    return (
      <Alert title="Payments aren't live yet">
        Want a paid plan now? Email{" "}
        <a
          href={SUPPORT_MAILTO}
          className="font-medium break-all text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
        >
          {BRAND.supportEmail}
        </a>{" "}
        and we&apos;ll set you up.
      </Alert>
    );
  }
  return null;
}
