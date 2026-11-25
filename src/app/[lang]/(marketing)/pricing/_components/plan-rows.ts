import {
  applicationLimit,
  FEATURES,
  FREE_JOB_MATCHES,
  FREE_TEMPLATES,
  PLANS,
  resumeLimit,
  type PlanId,
} from "@/config/plans";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import type { PricingMessages } from "../../_components/price-copy";

export type PlanCell = string | boolean;

export type PlanRow = { label: string; detail?: string; cells: Record<PlanId, PlanCell> };

export type PlanRowGroup = { title: string; rows: PlanRow[] };

export type TableMessages = PricingMessages["table"];

const paid = (value: PlanCell, free: PlanCell = false): Record<PlanId, PlanCell> => ({
  free,
  pro: value,
  max: value,
});

export function planRows(t: TableMessages, format: Format): PlanRowGroup[] {
  const perPlan = (limit: (plan: PlanId) => number): Record<PlanId, PlanCell> => ({
    free: format.number(limit("free")),
    pro: format.number(limit("pro")),
    max: format.number(limit("max")),
  });
  const rows = t.rows;
  return [
    {
      title: t.groups.ai,
      rows: FEATURES.map((feature) => ({
        ...t.ai[feature],
        cells: {
          free: PLANS.free.limits[feature] > 0 ? format.number(PLANS.free.limits[feature]) : false,
          pro: format.number(PLANS.pro.limits[feature]),
          max: format.number(PLANS.max.limits[feature]),
        },
      })),
    },
    {
      title: t.groups.resumes,
      rows: [
        { label: rows.recruiterView, cells: paid(true, true) },
        { label: rows.resumes, detail: rows.resumesDetail, cells: perPlan(resumeLimit) },
        {
          label: rows.formats,
          cells: paid(
            fmt(rows.allFormats, { count: format.number(TEMPLATE_IDS.length) }),
            format.number(FREE_TEMPLATES.length),
          ),
        },
        { label: rows.pdf, cells: paid(true, true) },
        { label: rows.word, cells: paid(true) },
        { label: rows.share, cells: paid(true) },
        {
          label: rows.portfolio,
          detail: fmt(rows.portfolioDetail, {
            count: format.number(PORTFOLIO_TEMPLATE_IDS.length),
          }),
          cells: paid(true),
        },
      ],
    },
    {
      title: t.groups.jobs,
      rows: [
        {
          label: rows.matches,
          cells: paid(
            rows.allMatches,
            fmt(rows.closestMatches, { count: format.number(FREE_JOB_MATCHES) }),
          ),
        },
        { label: rows.filters, cells: paid(true) },
        { label: rows.tracked, cells: perPlan(applicationLimit) },
        { label: rows.reminders, cells: paid(true, true) },
        { label: rows.hireFrom, cells: paid(true) },
      ],
    },
  ];
}
