import { CircleCheck } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusIcon, StatusPill } from "@/components/ui/status";
import type { RecruiterReport } from "@/lib/checks/types";

export type ExportCheckResultProps = {
  report: RecruiterReport;
  original: RecruiterReport | null;
};

function Tally({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-surface-muted p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="flex items-center gap-2">
        <StatusIcon status={count === 0 ? "pass" : "fail"} label="" />
        <span className="font-display text-2xl leading-none font-semibold text-ink tabular-nums">
          {count}
        </span>
        <span className="text-sm text-muted">{count === 1 ? "problem" : "problems"}</span>
      </dd>
    </div>
  );
}

export function ExportCheckResult({ report, original }: ExportCheckResultProps) {
  const open = report.checks.filter((check) => check.status !== "pass");
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Your new PDF, checked</CardTitle>
        <CardDescription>
          The same checks we ran on your upload, run on the PDF you&apos;re downloading.
        </CardDescription>
      </CardHeader>
      <dl className={original ? "grid grid-cols-2 gap-3" : "grid gap-3"}>
        {original ? <Tally label="Before" count={original.counts.fail} /> : null}
        <Tally label={original ? "After" : "Problems"} count={report.counts.fail} />
      </dl>
      {open.length ? (
        <ul className="flex flex-col gap-3">
          {open.map((check) => (
            <li key={check.id} className="flex flex-col gap-1.5 border-t border-border pt-3">
              <StatusPill status={check.status} />
              <p className="text-sm font-medium text-ink">{check.title}</p>
              <p className="text-sm text-muted">{check.fix ?? check.detail}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-sm font-medium text-pass-ink">
          <CircleCheck className="size-4 shrink-0 text-pass" />
          All {report.checks.length} checks passed.
        </p>
      )}
    </Card>
  );
}
