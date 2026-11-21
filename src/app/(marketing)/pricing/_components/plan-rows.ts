import {
  FEATURES,
  FREE_APPLICATIONS,
  FREE_JOB_MATCHES,
  FREE_TEMPLATES,
  PLANS,
  RESUME_LIMITS,
  resumeLimit,
  type Feature,
  type PlanId,
} from "@/config/plans";
import { APPLICATION_LIMITS } from "@/lib/applications/schema";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { TEMPLATE_IDS } from "@/lib/resume/schema";

export type PlanCell = string | boolean;

export type PlanRow = { label: string; detail?: string; cells: Record<PlanId, PlanCell> };

export type PlanRowGroup = { title: string; rows: PlanRow[] };

const count = new Intl.NumberFormat("en-US");

const AI_ROWS: Record<Feature, { label: string; detail?: string }> = {
  tailor: { label: "Tailored versions", detail: "Your resume rewritten for one job" },
  letter: {
    label: "Letters and interview prep",
    detail: "Cover letters, outreach messages, answers and prep, counted together",
  },
  fix: { label: "Line fixes with Otto" },
  import: {
    label: "Uploads read by AI",
    detail: "Past this, and on Free, the basic reader reads them",
  },
  draft: { label: "First drafts from your notes" },
  github: { label: "Project drafts from GitHub" },
};

const paid = (value: PlanCell, free: PlanCell = false): Record<PlanId, PlanCell> => ({
  free,
  pro: value,
  max: value,
});

export function planRows(): PlanRowGroup[] {
  return [
    {
      title: "Otto's AI help, each month",
      rows: FEATURES.map((feature) => ({
        ...AI_ROWS[feature],
        cells: {
          free: PLANS.free.limits[feature] > 0 ? count.format(PLANS.free.limits[feature]) : false,
          pro: count.format(PLANS.pro.limits[feature]),
          max: count.format(PLANS.max.limits[feature]),
        },
      })),
    },
    {
      title: "Resumes and downloads",
      rows: [
        { label: "Recruiter view and editing by hand", cells: paid(true, true) },
        {
          label: "Resumes",
          cells: {
            free: count.format(RESUME_LIMITS.free),
            pro: count.format(resumeLimit("pro")),
            max: count.format(resumeLimit("max")),
          },
        },
        {
          label: "Formats",
          cells: paid(`All ${TEMPLATE_IDS.length}`, count.format(FREE_TEMPLATES.length)),
        },
        { label: "PDF downloads", cells: paid(true, true) },
        { label: "Word (.docx) downloads", cells: paid(true) },
        { label: "Share links", cells: paid(true) },
        {
          label: "Portfolio site",
          detail: `${PORTFOLIO_TEMPLATE_IDS.length} designs, made from your resume`,
          cells: paid(true),
        },
      ],
    },
    {
      title: "Jobs and applications",
      rows: [
        { label: "Job matches", cells: paid("All", `${FREE_JOB_MATCHES} closest`) },
        { label: "Filters and saved jobs", cells: paid(true) },
        {
          label: "Tracked applications",
          cells: paid(count.format(APPLICATION_LIMITS.perUser), count.format(FREE_APPLICATIONS)),
        },
        { label: "Follow-up reminders", cells: paid(true, true) },
        { label: "Where each job can hire from", cells: paid(true) },
      ],
    },
  ];
}
