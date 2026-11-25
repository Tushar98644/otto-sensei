import { CircleCheck, RotateCw, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import { Spinner } from "@/components/ui/spinner";
import { StatusIcon, StatusPill } from "@/components/ui/status";
import { countText } from "../count";
import { useCheckText } from "../review/use-check-text";
import type { ExportCheck } from "./use-export-check";

type CheckCopy = Messages["studioDownload"]["check"];

function Tally({ label, count }: { label: string; count: number }) {
  const t = useMessages("studioDownload").check;
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-surface-muted p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="flex items-center gap-2">
        <StatusIcon status={count === 0 ? "pass" : "fail"} label="" />
        <span className="font-display text-2xl leading-none text-ink lining-nums tabular-nums">
          {count}
        </span>
        <span className="text-sm text-muted">{count === 1 ? t.problem : t.problems}</span>
      </dd>
    </div>
  );
}

export function checkSummary(
  t: CheckCopy,
  format: Format,
  check: Pick<ExportCheck, "report" | "checking">,
): string {
  if (check.checking) return t.checking;
  const report = check.report;
  if (!report) return "";
  const fails = report.counts.fail;
  if (fails > 0) return countText(format, t.checkedProblems, fails);
  return t.checkedClean;
}

export type ExportCheckResultProps = { check: ExportCheck; ready: boolean };

export function ExportCheckResult({ check, ready }: ExportCheckResultProps) {
  const { report, original } = check;
  const t = useMessages("studioDownload").check;
  const format = useFormat();
  const checkText = useCheckText();
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
          {t.tryAgain}
        </Button>
      </div>
    );
  }
  if (!report) {
    if (check.checking || check.queued) {
      return (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Spinner className="size-4 shrink-0" />
          {t.reading}
        </p>
      );
    }
    if (!ready) {
      return <p className="text-sm text-muted">{t.soon}</p>;
    }
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="min-w-0 flex-1 text-sm text-muted">{t.see}</p>
        <Button variant="secondary" size="sm" onClick={() => void check.run()}>
          <ScanText />
          {t.check}
        </Button>
      </div>
    );
  }
  const open = report.checks.filter((item) => item.status !== "pass").map(checkText);
  const fails = report.counts.fail;
  return (
    <div className="flex flex-col gap-3">
      {original ? (
        <dl className="grid grid-cols-2 gap-3">
          <Tally label={t.before} count={original.counts.fail} />
          <Tally label={t.after} count={report.counts.fail} />
        </dl>
      ) : null}
      {open.length ? (
        <>
          <p className="text-sm text-ink">
            {fails > 0
              ? countText(format, t.problemsIn, fails)
              : countText(format, t.worthALook, open.length)}
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
          {fmt(t.allPassed, { count: report.checks.length })}
        </p>
      )}
    </div>
  );
}
