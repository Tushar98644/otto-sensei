"use client";

import { useEffect } from "react";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { reportClientError } from "@/lib/observability/browser";
import { reloadForStaleBuild } from "@/lib/observability/stale-build";

function digestOf(error: unknown): string | null {
  if (!(error instanceof Error) || !("digest" in error)) return null;
  return typeof error.digest === "string" ? error.digest : null;
}

export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    if (!reloadForStaleBuild(error)) reportClientError(error);
  }, [error]);

  const digest = digestOf(error);
  return (
    <EmptyState
      titleAs="h2"
      illustration={
        <Otto pose="worried" size={112} title="Otto the otter, looking worried" className="size-28" />
      }
      title="This page didn't load"
      description={
        <>
          {OTTO.errors.generic} Your work is saved in this browser.
          {digest ? <span className="mt-3 block text-xs text-subtle">Error reference: {digest}</span> : null}
        </>
      }
      action={<Button onClick={retry}>Try again</Button>}
      className="py-24"
    />
  );
}
