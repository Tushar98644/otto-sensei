import type { ReactNode } from "react";
import { FormatImage } from "@/components/formats/format-image";
import { PortfolioShot, PreloadShot } from "@/components/portfolio/portfolio-shot";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { ROUTES } from "@/components/site/routes";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { MATCH_LABELS } from "@/lib/job-feed/types";
import { DEMO_PERSON } from "./recruiter-demo-data";

function Row({ title, meta, children }: { title: string; meta: string; children?: ReactNode }) {
  return (
    <li className="flex flex-col gap-2 rounded-xl bg-surface p-3 ring-1 ring-border sm:p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{title}</p>
        <p className="truncate text-xs text-muted">{meta}</p>
      </div>
      {children}
    </li>
  );
}

function ResumesPreview() {
  const items = [
    { id: "classic", title: "Jordan Ellis · Marketing", meta: "2 lines to fix" },
    { id: "compact", title: "Tailored for Northwind", meta: "Ready to send" },
    { id: "executive", title: "Tailored for Ledgerly", meta: "Ready to send" },
  ] as const;
  return (
    <ul className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <li key={item.id} className="flex min-w-0 flex-col gap-2">
          <FormatImage
            info={TEMPLATE_INFO[item.id]}
            sizes="(min-width: 1024px) 12rem, 30vw"
            loading="lazy"
            className="rounded-lg ring-1 ring-border"
          />
          <div className="min-w-0 text-xs text-pretty wrap-break-word">
            <p className="font-medium text-ink sm:truncate">{item.title}</p>
            <p className="text-muted sm:truncate">
              {TEMPLATE_INFO[item.id].name} · {item.meta}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function LettersPreview() {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-surface p-4 text-sm/6 text-ink ring-1 ring-border sm:p-5">
        <p className="text-xs text-muted">Senior Product Designer · Northwind · 210 words</p>
        <p className="mt-3">Dear Northwind team,</p>
        <p className="mt-2 text-muted">
          At {DEMO_PERSON.jobs[0].company} I redesigned checkout, and orders went up 18%. Your post
          asks for someone who can tie design to results, which is the work I enjoy most…
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        <Row title="Why do you want to work here?" meta="Answer · Ledgerly · 90 words" />
      </ul>
    </div>
  );
}

function JobsPreview() {
  return (
    <ul className="flex flex-col gap-2">
      <Row title="Senior Product Designer · Northwind" meta="Remote, Europe · 2 days ago">
        <div className="flex flex-wrap gap-2">
          <StatusPill status="pass">{MATCH_LABELS.strong}</StatusPill>
        </div>
        <p className="text-xs text-ink">Found in your resume: Figma, user research, prototyping.</p>
      </Row>
      <Row title="UX Designer · Harbor Health" meta="New York, US · 1 week ago">
        <div className="flex flex-wrap gap-2">
          <Badge>{MATCH_LABELS.good}</Badge>
          <StatusPill status="fail">Likely blocked</StatusPill>
        </div>
        <p className="text-xs text-muted">
          You said you&apos;d need a visa to work in the United States.
        </p>
      </Row>
    </ul>
  );
}

const BOARD = [
  {
    column: "Applied",
    cards: [
      ["Northwind", "Follow up Thu"],
      ["Ledgerly", "Sent Nov 3"],
    ],
  },
  { column: "Interview", cards: [["Harbor Health", "Prep ready"]] },
  { column: "Offer", cards: [["Pinecrest", "Reply by Fri"]] },
] as const;

function ApplicationsPreview() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {BOARD.map(({ column, cards }) => (
        <div key={column} className="flex min-w-0 flex-col gap-2 rounded-xl bg-surface-muted p-2">
          <p className="px-1 text-xs font-medium text-muted">
            {column} · {cards.length}
          </p>
          {cards.map(([company, note]) => (
            <div key={company} className="rounded-lg bg-surface p-2 ring-1 ring-border">
              <p className="truncate text-xs font-medium text-ink">{company}</p>
              <p className="truncate text-xs text-muted">{note}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function InterviewPreview() {
  const parts = [
    ["Likely question", "Tell me about a design you shipped that moved a number."],
    ["Your story", `Checkout redesign at ${DEMO_PERSON.jobs[0].company}: orders up 18%.`],
    ["Ask them", "How does the team measure design's impact?"],
  ] as const;
  return (
    <ul className="flex flex-col gap-2">
      {parts.map(([label, text]) => (
        <li key={label} className="rounded-xl bg-surface p-3 ring-1 ring-border sm:p-4">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1 text-sm text-ink">{text}</p>
        </li>
      ))}
    </ul>
  );
}

const PORTFOLIO_SIZES = "(min-width: 1024px) 40rem, 90vw";

// Rendered beside the tabs: the Portfolio tab starts closed, so nothing inside it mounts yet.
export function PreloadPortfolioPreview() {
  return <PreloadShot id="reel" sizes={PORTFOLIO_SIZES} />;
}

function PortfolioPreview() {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-border">
      <p className="truncate bg-surface px-3 py-2 font-mono text-xs text-muted">
        ottosensei.com/p/jordan-ellis
      </p>
      <PortfolioShot id="reel" sizes={PORTFOLIO_SIZES} />
    </div>
  );
}

export const FEATURE_PREVIEWS: Record<string, () => ReactNode> = {
  [ROUTES.dashboardResumes]: ResumesPreview,
  [ROUTES.dashboardLetters]: LettersPreview,
  [ROUTES.dashboardJobs]: JobsPreview,
  [ROUTES.dashboardApplications]: ApplicationsPreview,
  [ROUTES.dashboardInterview]: InterviewPreview,
  [PORTFOLIO_ROUTE]: PortfolioPreview,
};
