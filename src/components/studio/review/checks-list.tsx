"use client";

import { ChevronRight } from "lucide-react";
import { useId } from "react";
import { StatusPill } from "@/components/ui/status";
import type { CheckStatus, RecruiterCheck } from "@/lib/checks/types";
import { pluralize } from "@/lib/utils";

const GROUP_TITLES: Record<Exclude<CheckStatus, "pass">, string> = {
  fail: "Needs fixing",
  warn: "Could be better",
};

export type ChecksListProps = {
  checks: RecruiterCheck[];
  // Visually hidden when a tab already names the panel.
  hideHeading?: boolean;
};

export function ChecksList({ checks, hideHeading = false }: ChecksListProps) {
  const headingId = useId();
  const failed = checks.filter((check) => check.status === "fail");
  const warned = checks.filter((check) => check.status === "warn");
  const passed = checks.filter((check) => check.status === "pass");

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <h2
        id={headingId}
        className={hideHeading ? "sr-only" : "font-sans text-lg font-semibold text-ink"}
      >
        What we checked
      </h2>
      {failed.length > 0 ? <CheckGroup title={GROUP_TITLES.fail} checks={failed} /> : null}
      {warned.length > 0 ? <CheckGroup title={GROUP_TITLES.warn} checks={warned} /> : null}
      {passed.length > 0 ? (
        // Collapsed: what passed matters less than what to fix.
        <details className="group rounded-2xl bg-surface">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-ink hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
            <ChevronRight
              className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
              aria-hidden
            />
            {pluralize(passed.length, "check")} passed
          </summary>
          <ul className="flex flex-col gap-3 px-4 pb-4">
            {passed.map((check) => (
              <CheckItem key={check.id} check={check} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function CheckGroup({ title, checks }: { title: string; checks: RecruiterCheck[] }) {
  const headingId = useId();
  return (
    <div role="group" aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-sm font-semibold text-muted">
        {title} ({checks.length})
      </h3>
      <ul className="flex flex-col gap-3">
        {checks.map((check) => (
          <CheckItem key={check.id} check={check} />
        ))}
      </ul>
    </div>
  );
}

function CheckItem({ check }: { check: RecruiterCheck }) {
  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusPill status={check.status} />
        <h4 className="text-sm font-semibold text-ink">{check.title}</h4>
      </div>
      <p className="text-sm text-muted">{check.detail}</p>
      {check.fix ? (
        <p className="text-sm text-ink">
          <span className="font-medium">How to fix: </span>
          {check.fix}
        </p>
      ) : null}
    </li>
  );
}
