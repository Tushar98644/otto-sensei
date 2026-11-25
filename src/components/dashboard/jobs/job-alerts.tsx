"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { BellPlus, X } from "lucide-react";
import { errorMessage } from "@/components/account/errors";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api } from "@/lib/api/client";
import type { JobAlertsResponse, NewJobAlert } from "@/lib/job-feed/alert-types";
import type { JobFilters, LookingForChoice } from "@/lib/job-feed/types";
import { useAppQueryClient } from "@/lib/queries/client";
import type { FilterMemory, Point } from "./filter-memory";
import { useRegionName } from "./near-filter";
import { cityLabel } from "./view";

// Kept in step with JOB_ALERTS in lib/job-feed/alerts.ts.
const MOST = 5;
const NAME_CHARS = 80;

type JobAlertsProps = {
  userId: string;
  filters: JobFilters;
  memory: FilterMemory;
  point: Point | null;
  choice: LookingForChoice;
  role: string | null;
  resumeId: string | null;
};

// Turns the search on screen into a saved one the bell watches once a day.
export function JobAlerts({
  userId,
  filters,
  memory,
  point,
  choice,
  role,
  resumeId,
}: JobAlertsProps) {
  const t = useMessages("jobs");
  const words = t.alerts;
  const format = useFormat();
  const regionName = useRegionName();
  const client = useAppQueryClient();
  const key = ["job-alerts", userId] as const;
  const list = useQuery({ queryKey: key, queryFn: () => api.jobAlerts() }, client);
  const store = (data: JobAlertsResponse) => client.setQueryData(key, data);
  const add = useMutation(
    {
      mutationFn: (body: NewJobAlert) => api.addJobAlert(body),
      onSuccess: (data) => {
        store(data);
        toast({ title: words.added, variant: "success" });
      },
      onError: (error) =>
        toast({ title: words.failed, description: errorMessage(error), variant: "error" }),
    },
    client,
  );
  const remove = useMutation(
    {
      mutationFn: (id: string) => api.removeJobAlert(id),
      onSuccess: store,
      onError: (error) =>
        toast({ title: words.removeFailed, description: errorMessage(error), variant: "error" }),
    },
    client,
  );

  const alerts = list.data?.alerts ?? [];
  const full = alerts.length >= MOST;
  const name = [
    role || words.anyRole,
    filters.q,
    memory.nearCity && !point ? cityLabel(memory.nearCity, regionName) : "",
    filters.remote ? t.filters.remoteMode : filters.workMode ? t.filters[filters.workMode] : "",
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, NAME_CHARS);

  return (
    <section className="flex flex-col gap-2 border-t border-border pt-4 sm:col-span-2">
      <h3 className="text-sm font-medium text-ink">{words.title}</h3>
      {alerts.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="inline-flex h-8 max-w-full items-center gap-1 rounded-full bg-surface-muted pr-1 pl-3 text-xs text-ink"
            >
              <span className="truncate">{alert.name}</span>
              <button
                type="button"
                aria-label={fmt(words.remove, { name: alert.name })}
                disabled={remove.isPending}
                onClick={() => remove.mutate(alert.id)}
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/6 hover:text-ink"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          loading={add.isPending}
          disabled={full || point !== null}
          onClick={() =>
            add.mutate({
              name,
              filters: { ...filters, near: point ? null : filters.near },
              choice,
              resumeId,
            })
          }
        >
          <BellPlus aria-hidden />
          {words.add}
        </Button>
      </div>
      <p className="text-xs/5 text-subtle">
        {point
          ? words.pickCity
          : full
            ? fmt(words.full, { count: format.number(MOST) })
            : words.hint}
      </p>
    </section>
  );
}
