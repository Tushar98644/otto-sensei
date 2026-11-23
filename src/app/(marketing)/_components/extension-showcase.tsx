import { ArrowUpRight } from "lucide-react";
import { OttoMark } from "@/components/site/otto-mark";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
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

// The mock's keys show the badge's buttons but take no clicks.
const MOCK_KEY = "pointer-events-none h-8 flex-1 px-2 text-xs pointer-coarse:h-8";

function BadgeMock() {
  return (
    <Panel
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
      <div className="relative -mt-32 mr-3 ml-auto w-[min(17rem,calc(100%-1.5rem))] rounded-2xl bg-surface p-4 shadow-float ring-1 ring-ink/5 sm:mr-6">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-border">
            <OttoMark className="size-5" />
          </span>
          <p className="text-xs/4 text-subtle">
            <span className="font-medium text-ink">Otto</span> · {POST.company} careers
          </p>
        </div>
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
          <span className={buttonClasses({ size: "sm", className: MOCK_KEY })}>Save</span>
          <span
            className={buttonClasses({ variant: "secondary", size: "sm", className: MOCK_KEY })}
          >
            Tailor
          </span>
          <span
            className={buttonClasses({ variant: "secondary", size: "sm", className: MOCK_KEY })}
          >
            Letter
          </span>
        </div>
      </div>
    </Panel>
  );
}

export function ExtensionShowcase() {
  return (
    <Section
      id="chrome-extension"
      labelledBy="extension-showcase-title"
      lazySize="[contain-intrinsic-size:auto_1660px] sm:[contain-intrinsic-size:auto_1500px] lg:[contain-intrinsic-size:auto_1090px]"
    >
      <SectionHeader
        id="extension-showcase-title"
        eyebrow={CHROME_STORE_URL ? "Otto for Chrome" : "Otto for Chrome · coming soon"}
        title="Your match, right on the job post"
      >
        Otto for Chrome checks job posts against your resume on the pages where you read them, and
        saves the ones you want to your board.
      </SectionHeader>
      <div className="mt-12 grid items-start gap-10 sm:mt-16 lg:grid-cols-5 lg:gap-12">
        <div className="lg:col-span-3">
          <BadgeMock />
        </div>
        <ul role="list" className="flex flex-col gap-8 lg:col-span-2">
          {POINTS.map(({ title, text }) => (
            <li key={title} className="flex flex-col gap-2">
              <h3 className="text-lg/7 font-medium tracking-tight text-ink">{title}</h3>
              <p className="max-w-prose text-base/7 text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </div>
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
