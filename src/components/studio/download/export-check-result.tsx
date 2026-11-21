import { CircleCheck, RotateCw, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StatusIcon, StatusPill } from "@/components/ui/status";
import { pluralize } from "@/lib/utils";
import type { ExportCheck } from "./use-export-check";

function Tally({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-surface-muted p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="flex items-center gap-2">
        <StatusIcon status={count === 0 ? "pass" : "fail"} label="" />
        <span className="font-display text-2xl leading-none text-ink lining-nums tabular-nums">
          {count}
        </span>
        <span className="text-sm text-muted">{count === 1 ? "problem" : "problems"}</span>
      </dd>
    </div>
  );
}

export function checkSummary(check: Pick<ExportCheck, "report" | "checking">): string {
  if (check.checking) return "Checking your PDF.";
  const report = check.report;
  if (!report) return "";
  const fails = report.counts.fail;
  if (fails > 0) return `Checked: ${pluralize(fails, "problem")} for hiring software.`;
  return "Checked: hiring software reads every line.";
}

export type ExportCheckResultProps = { check: ExportCheck; ready: boolean };

export function ExportCheckResult({ check, ready }: ExportCheckResultProps) {
  const { report, original } = check;
  if (check.error) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-fail-soft py-2 pr-2 pl-4">
        <p role="alert" className="min-w-0 flex-1 text-sm text-fail-ink">
          {check.error}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void check.run()}
          disabled={!ready}
          loading={check.checking}
        >
          <RotateCw />
          Try again
        </Button>
      </div>
    );
  }
  if (!report) {
    if (check.checking || check.queued) {
      return (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Spinner className="size-4 shrink-0" />
          Reading your PDF the way hiring software does.
        </p>
      );
    }
    if (!ready) {
      return <p className="text-sm text-muted">I&apos;ll read your PDF as soon as it&apos;s made.</p>;
    }
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="min-w-0 flex-1 text-sm text-muted">
          See how hiring software reads this version.
        </p>
        <Button variant="secondary" size="sm" onClick={() => void check.run()}>
          <ScanText />
          Check this PDF
        </Button>
      </div>
    );
  }
  const open = report.checks.filter((item) => item.status !== "pass");
  const fails = report.counts.fail;
  return (
    <div className="flex flex-col gap-3">
      {original ? (
        <dl className="grid grid-cols-2 gap-3">
          <Tally label="Before" count={original.counts.fail} />
          <Tally label="After" count={report.counts.fail} />
        </dl>
      ) : null}
      {open.length ? (
        <>
          <p className="text-sm text-ink">
            {fails > 0
              ? `${pluralize(fails, "problem")} for hiring software in this PDF.`
              : `Hiring software reads every line. ${pluralize(open.length, "thing")} worth a look.`}
          </p>
          <ul className="divide-y divide-border border-y border-border">
            {open.map((item) => (
              <li key={item.id} className="flex flex-col gap-1.5 py-3">
                <StatusPill status={item.status} />
                <p className="text-sm font-medium text-ink">{item.title}</p>
                <p className="text-sm text-muted">{item.fix ?? item.detail}</p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted">
          <CircleCheck aria-hidden className="size-4 shrink-0 text-pass" />
          Hiring software reads every line. All {report.checks.length} checks passed.
        </p>
      )}
    </div>
  );
}
