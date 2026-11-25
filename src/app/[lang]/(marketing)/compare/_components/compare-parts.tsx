import {
  Check,
  FileText,
  Globe,
  Inbox,
  MessagesSquare,
  PenLine,
  Search,
  type LucideIcon,
} from "lucide-react";
import { OttoMark } from "@/components/site/otto-mark";
import { BRAND } from "@/config/brand";
import { PLANS } from "@/config/plans";
import { fmt } from "@/i18n/format";
import type { CompareCell, CompareNote, Competitor } from "@/lib/seo-pages/compare";
import { cn } from "@/lib/utils";
import type { CompareMessages } from "../../_components/seo-copy";
import { H2_CLASSES } from "../../ats/_components/guide-parts";

type Step = { icon: LucideIcon; key: keyof PipelineWords["steps"]; pro?: boolean };

type PipelineWords = CompareMessages["pipeline"];

// The whole hunt in one account; facts about Otto only, so they hold on every comparison.
const PIPELINE: readonly Step[] = [
  { icon: FileText, key: "check" },
  { icon: Search, key: "jobs" },
  { icon: PenLine, key: "tailor", pro: true },
  { icon: Inbox, key: "track", pro: true },
  { icon: MessagesSquare, key: "prep", pro: true },
  { icon: Globe, key: "share", pro: true },
];

export function PipelineStrip({ t, className }: { t: PipelineWords; className?: string }) {
  return (
    <section aria-labelledby="pipeline-title" className={className}>
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 id="pipeline-title" className={H2_CLASSES}>
          {t.title}
        </h2>
        <p className="text-lg/7 text-pretty text-muted">{fmt(t.intro, { brand: BRAND.name })}</p>
      </div>
      <ol role="list" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PIPELINE.map((step, index) => (
          <li key={step.key} className="flex flex-col gap-4 rounded-3xl bg-surface p-6 shadow-card">
            <span className="flex items-center justify-between">
              <span
                aria-hidden
                className="flex size-11 items-center justify-center rounded-2xl bg-surface-muted text-ink"
              >
                <step.icon className="size-5" />
              </span>
              <span className="text-sm/5 text-subtle tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
            </span>
            <span className="flex flex-col gap-1.5">
              <span className="flex items-center gap-2 text-lg/7 font-medium tracking-tight text-ink">
                {t.steps[step.key].title}
                {step.pro ? (
                  <span className="rounded-md bg-surface-muted px-1.5 text-xs/5 font-medium text-muted">
                    {PLANS.pro.name}
                  </span>
                ) : null}
              </span>
              <span className="text-base/7 text-pretty text-muted">{t.steps[step.key].text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Cell({ cell, name, ours }: { cell: CompareCell; name: string; ours: boolean }) {
  return (
    <td
      data-name={name}
      className={cn(
        "px-5 py-5 align-top text-sm/6 text-pretty text-muted sm:px-6",
        "max-md:block max-md:px-0 max-md:py-2 max-md:before:mb-1 max-md:before:block max-md:before:text-xs/4 max-md:before:font-medium max-md:before:tracking-widest max-md:before:text-subtle max-md:before:uppercase max-md:before:content-[attr(data-name)]",
        ours && "md:bg-primary/[0.04]",
      )}
    >
      <span className="block text-base/7 font-medium text-ink">{cell.answer}</span>
      {cell.detail ? <span className="mt-1 block">{cell.detail}</span> : null}
    </td>
  );
}

export function CompareTable({ competitor, caption }: { competitor: Competitor; caption: string }) {
  return (
    <div className="mt-10 overflow-hidden rounded-3xl bg-surface shadow-card">
      <table className="w-full border-collapse text-left md:table-fixed">
        <caption className="sr-only">{caption}</caption>
        <thead className="max-md:sr-only">
          <tr className="border-b border-border">
            <td className="w-[22%] px-6 py-4" />
            <th scope="col" className="bg-primary/[0.04] px-6 py-4 text-sm/6 font-medium text-ink">
              <span className="flex items-center gap-2">
                <OttoMark className="size-5" />
                {BRAND.name}
              </span>
            </th>
            <th scope="col" className="px-6 py-4 text-sm/6 font-medium text-ink">
              {competitor.name}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {competitor.rows.map((row) => (
            <tr key={row.label} className="max-md:block max-md:px-5 max-md:py-4">
              <th
                scope="row"
                className="px-5 py-5 align-top text-base/7 font-medium tracking-tight text-ink max-md:block max-md:px-0 max-md:pt-0 max-md:pb-1 sm:px-6"
              >
                {row.label}
              </th>
              <Cell cell={row.otto} name={BRAND.name} ours />
              <Cell cell={row.them} name={competitor.name} ours={false} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReasonCards({ notes }: { notes: readonly CompareNote[] }) {
  return (
    <ul role="list" className="mt-10 grid gap-4 sm:grid-cols-2">
      {notes.map((note) => (
        <li
          key={note.title}
          className="flex flex-col gap-4 rounded-3xl bg-surface p-6 shadow-card sm:p-8"
        >
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-full bg-primary text-white"
          >
            <Check className="size-4.5" strokeWidth={2.5} />
          </span>
          <span className="flex flex-col gap-2">
            <h3 className="text-xl/7 font-medium tracking-tight text-ink">{note.title}</h3>
            <p className="text-base/7 text-pretty text-muted">{note.text}</p>
          </span>
        </li>
      ))}
    </ul>
  );
}
