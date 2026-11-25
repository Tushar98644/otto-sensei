"use client";

import { useEffect } from "react";
import { Otto } from "@/components/mascot/otto";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { reportClientError } from "@/lib/observability/browser";
import { reloadForStaleBuild } from "@/lib/observability/stale-build";

function digestOf(error: unknown): string | null {
  if (!(error instanceof Error) || !("digest" in error)) return null;
  return typeof error.digest === "string" ? error.digest : null;
}

export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  const { errors } = useMessages("dashboard");
  useEffect(() => {
    if (!reloadForStaleBuild(error)) reportClientError(error);
  }, [error]);

  const digest = digestOf(error);
  return (
    <EmptyState
      titleAs="h2"
      illustration={
        <Otto pose="worried" size={112} title={errors.worriedOtto} className="size-28" />
      }
      title={errors.pageTitle}
      description={
        <>
          {errors.generic} {errors.savedHere}
          {digest ? (
            <span className="mt-3 block text-xs text-subtle">
              {fmt(errors.reference, { digest })}
            </span>
          ) : null}
        </>
      }
      action={<Button onClick={retry}>{errors.tryAgain}</Button>}
      className="py-24"
    />
  );
}
