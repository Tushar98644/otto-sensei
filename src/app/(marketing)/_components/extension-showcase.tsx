import { ArrowUpRight, ChevronDown, CircleCheck, Paperclip, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { OttoMark } from "@/components/site/otto-mark";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Panel, Window } from "@/components/ui/panel";
import { PLAN_ORDER, PLANS } from "@/config/plans";
import { extensionAccess, type ExtensionTool } from "@/lib/extension/plan";
import { CHROME_STORE_URL } from "@/lib/extension/store";
import { cn } from "@/lib/utils";
import { Section, SectionHeader } from "./section";

const planList = new Intl.ListFormat("en-US", { type: "conjunction" });

// "Pro and Max": read from the extension's own plan rules, so the copy can't promise more.
function plansWith(tool: ExtensionTool): string {
  return planList.format(
    PLAN_ORDER.filter((plan) => extensionAccess(plan)[tool]).map((plan) => PLANS[plan].name),
  );
}

type Point = { title: string; text: string };

const POINTS: readonly Point[] = [
  {
    title: "A match badge on the post",
    text: "On LinkedIn, Naukri and company career pages, Otto's badge shows which of the post's skills your resume has and which it's missing. The check runs in your browser and never sends the post anywhere.",
  },
  {
    title: "Save to your tracker",
    text: "Save puts the job in To apply on your Applications board, with a copy of the post in case it's taken down.",
  },
  {
    title: "Tailor and Letter from the post",
    text: `On ${plansWith("tailor")}, Tailor opens Otto with your resume tailored to that job, and Letter with a cover letter for it.`,
  },
  {
    title: "Fill with Otto on application forms",
    text: `On ${plansWith("fill")}, Otto fills Greenhouse, Lever, Ashby and Workday forms from your resume and saved answers. You check it and press Submit. Otto never fills self-identification or consent questions.`,
  },
];

const POST = { title: "Senior Product Designer", company: "Northwind", where: "Remote, Europe" };
const SKILLS = { found: 3, total: 4, missing: "accessibility" };

// The sample person's details, and the file name the app gives their resume's PDF.
const FORM_FIELDS: readonly { label: string; value: string; span: string }[] = [
  { label: "First name", value: "Jordan", span: "col-span-1" },
  { label: "Last name", value: "Ellis", span: "col-span-1" },
  { label: "Email", value: "jordan.ellis@example.com", span: "col-span-2 sm:col-span-1" },
  { label: "Current company", value: "Brightloop", span: "col-span-2 sm:col-span-1" },
  { label: "Portfolio", value: "portfolio.example.com/jordan-ellis", span: "col-span-2" },
];
const RESUME_FILE = "Jordan-Ellis-Resume.pdf";
const DRAFT = {
  question: `Why ${POST.company}?`,
  answer: `I like how ${POST.company} makes complex data easy to read, and I'd bring the same care to its product, from research to prototypes.`,
};
const SELF_ID = "Gender";
// What the panel counts: each filled field, plus the draft once it's put in.
const FILLED = FORM_FIELDS.length + 1;

// The mock's keys show the page's buttons but take no clicks.
const MOCK_KEY = "pointer-events-none h-8 px-2 text-xs pointer-coarse:h-8";
const FIELD = "flex h-8 min-w-0 items-center rounded-lg border px-2.5 text-xs";
// Otto tints what he filled, as the extension does on the page.
const FILLED_FIELD = "border-lavender bg-lavender/50 text-ink";

function OttoCard({
  meta,
  className,
  children,
}: {
  meta: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative -mt-32 mr-3 ml-auto w-[min(17rem,calc(100%-1.5rem))] rounded-2xl bg-surface p-4 shadow-float ring-1 ring-ink/5 sm:mr-6",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-border">
          <OttoMark className="size-5" />
        </span>
        <p className="text-xs/4 text-subtle">
          <span className="font-medium text-ink">Otto</span> · {meta}
        </p>
      </div>
      {children}
    </div>
  );
}

function PostMock() {
  return (
    <div
      role="img"
      aria-label={`Example: Otto's badge in the corner of a ${POST.title} post, with ${SKILLS.found} of ${SKILLS.total} skills found and ${SKILLS.missing} missing.`}
    >
      <Window
        title={`${POST.company} careers`}
        meta="Job post"
        bodyClassName="px-4 pt-5 pb-24 sm:px-6"
      >
        <p className="text-lg/7 font-semibold text-ink">{POST.title}</p>
        <p className="text-sm/6 text-muted">
          {POST.company} · {POST.where}
        </p>
        <p className="mt-5 text-sm/6 font-medium text-ink">About the role</p>
        <div className="mt-2 flex flex-col gap-2.5">
          <span className="h-2 w-11/12 rounded-full bg-surface-muted" />
          <span className="h-2 w-4/5 rounded-full bg-surface-muted" />
          <span className="h-2 w-2/3 rounded-full bg-surface-muted" />
        </div>
        <p className="mt-5 text-sm/6 font-medium text-ink">What you&apos;ll bring</p>
        <div className="mt-2 flex flex-col gap-2.5">
          <span className="h-2 w-5/6 rounded-full bg-surface-muted" />
          <span className="h-2 w-3/5 rounded-full bg-surface-muted" />
        </div>
      </Window>
      <OttoCard meta={`${POST.company} careers`}>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl/none font-semibold tracking-tight text-ink tabular-nums">
            {SKILLS.found}
          </span>
          <span className="text-sm text-muted">
            of <span className="font-medium text-ink">{SKILLS.total}</span> skills found
          </span>
        </p>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: SKILLS.total }, (_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                index < SKILLS.found ? "bg-primary" : "bg-surface-strong",
              )}
            />
          ))}
        </div>
        <p className="mt-2 text-sm/6 text-muted">
          Missing: <mark className="highlighter text-ink">{SKILLS.missing}</mark>
        </p>
        <div className="mt-3 flex gap-2">
          {["Save", "Tailor", "Letter"].map((label, index) => (
            <span
              key={label}
              className={buttonClasses({
                variant: index === 0 ? "primary" : "secondary",
                size: "sm",
                className: cn(MOCK_KEY, "flex-1"),
              })}
            >
              {label}
            </span>
          ))}
        </div>
      </OttoCard>
    </div>
  );
}

function FormMock() {
  return (
    <div
      role="img"
      aria-label={`Example: Fill with Otto on ${POST.company}'s application form, with ${FILLED} fields filled, the resume attached, a drafted answer to "${DRAFT.question}" and the ${SELF_ID.toLowerCase()} question left blank for you.`}
    >
      <Window
        title={`${POST.company} · Apply`}
        meta="Application form"
        bodyClassName="grid grid-cols-2 gap-3 px-4 pt-5 pb-28 sm:px-6"
      >
        <p className="col-span-2 text-base/6 font-semibold text-ink">Apply for this job</p>
        {FORM_FIELDS.map(({ label, value, span }) => (
          <div key={label} className={cn("flex min-w-0 flex-col gap-1", span)}>
            <span className="text-xs/4 font-medium text-ink">{label}</span>
            <span className={cn(FIELD, FILLED_FIELD)}>
              <span className="truncate">{value}</span>
            </span>
          </div>
        ))}
        <div className="col-span-2 flex min-w-0 flex-col gap-1">
          <span className="text-xs/4 font-medium text-ink">Resume/CV</span>
          <span className={cn(FIELD, FILLED_FIELD, "gap-1.5")}>
            <Paperclip aria-hidden className="size-3.5 shrink-0 text-muted" />
            <span className="truncate">{RESUME_FILE}</span>
          </span>
        </div>
        <div className="col-span-2 flex min-w-0 flex-col gap-1">
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs/4 font-medium text-ink">{DRAFT.question}</span>
            <span className="inline-flex h-6.5 shrink-0 items-center gap-1 rounded-full border border-border-control bg-surface pr-2.5 pl-1 text-xs font-medium text-ink shadow-control">
              <OttoMark className="size-4.5" />
              Draft with Otto
            </span>
          </span>
          <span className={cn("rounded-lg border px-2.5 py-1.5 text-xs/5", FILLED_FIELD)}>
            {DRAFT.answer}
          </span>
        </div>
        <Eyebrow as="span" className="col-span-2 mt-2">
          Voluntary self-identification
        </Eyebrow>
        <div className="col-span-2 flex min-w-0 flex-col gap-1">
          <span className="text-xs/4 font-medium text-ink">{SELF_ID}</span>
          <span
            className={cn(FIELD, "justify-between border-border-strong bg-surface text-subtle")}
          >
            Select…
            <ChevronDown aria-hidden className="size-3.5" />
          </span>
        </div>
        <span className={buttonClasses({ size: "sm", className: cn(MOCK_KEY, "mt-2 w-fit px-3") })}>
          Submit application
        </span>
      </Window>
      <OttoCard meta="Greenhouse" className="-mt-24">
        <p className="mt-3 flex gap-2 text-sm/5 text-ink">
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-pass" />
          <span>
            Filled {FILLED} fields and attached <span className="font-medium">{RESUME_FILE}</span>.
          </span>
        </p>
        <p className="mt-2 flex gap-2 text-xs/5 text-muted">
          <Shield aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Left for you: 1 self-identification or consent question. Otto never answers those.
          </span>
        </p>
        <p className="mt-2 text-xs/5 font-medium text-ink">
          Check every answer, then press Submit yourself. Otto never sends a form.
        </p>
      </OttoCard>
    </div>
  );
}

export function ExtensionShowcase() {
  return (
    <Section
      id="chrome-extension"
      labelledBy="extension-showcase-title"
      lazySize="[contain-intrinsic-size:auto_2700px] sm:[contain-intrinsic-size:auto_2320px] lg:[contain-intrinsic-size:auto_1760px]"
    >
      <SectionHeader
        id="extension-showcase-title"
        eyebrow={CHROME_STORE_URL ? "Otto for Chrome" : "Otto for Chrome · coming soon"}
        title="Your match, right on the job post"
      >
        Otto for Chrome checks job posts against your resume on the pages where you read them, and
        saves the ones you want to your board.
      </SectionHeader>
      <Panel className="mt-12 grid items-start gap-8 sm:mt-16 lg:grid-cols-2 lg:gap-10">
        <div>
          <Eyebrow>On the job post</Eyebrow>
          <div className="mt-3">
            <PostMock />
          </div>
        </div>
        <div>
          <Eyebrow>On the application form</Eyebrow>
          <div className="mt-3">
            <FormMock />
          </div>
        </div>
      </Panel>
      <ul
        role="list"
        className="mt-10 grid gap-x-8 gap-y-8 border-t border-border pt-10 sm:grid-cols-2"
      >
        {POINTS.map(({ title, text }) => (
          <li key={title} className="flex flex-col gap-2">
            <h3 className="text-lg/7 font-medium tracking-tight text-ink">{title}</h3>
            <p className="max-w-prose text-base/7 text-muted">{text}</p>
          </li>
        ))}
      </ul>
      {CHROME_STORE_URL ? (
        <a
          href={CHROME_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses({ variant: "ghost", className: "mt-6 -ml-4.25" })}
        >
          Add to Chrome
          <ArrowUpRight aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : (
        <p className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-base/7 text-muted">
          <Badge>Coming soon</Badge>
          Not in the Chrome Web Store yet.
        </p>
      )}
    </Section>
  );
}
