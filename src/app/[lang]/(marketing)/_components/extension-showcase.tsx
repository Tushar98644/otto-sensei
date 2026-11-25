import { ArrowUpRight, ChevronDown, CircleCheck, Paperclip, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { OttoMark } from "@/components/site/otto-mark";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Panel, Window } from "@/components/ui/panel";
import { PLAN_ORDER, PLANS } from "@/config/plans";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { rich } from "@/i18n/rich";
import { extensionAccess, type ExtensionTool } from "@/lib/extension/plan";
import { CHROME_STORE_URL } from "@/lib/extension/store";
import { cn } from "@/lib/utils";
import type { HomeMessages, HomeProps } from "./home-copy";
import { joinList } from "./price-copy";
import { Section, SectionHeader } from "./section";

type Words = HomeMessages["extension"];

// "Pro and Max": read from the extension's own plan rules, so the copy can't promise more.
function plansWith(format: Format, tool: ExtensionTool): string {
  return joinList(
    format,
    PLAN_ORDER.filter((plan) => extensionAccess(plan)[tool]).map((plan) => PLANS[plan].name),
    "and",
  );
}

const POINTS: readonly (keyof Words["points"])[] = ["badge", "save", "tailor", "fill"];

const COMPANY = "Northwind";
const SKILLS = { found: 3, total: 4 };
const ACTIONS: readonly (keyof Words["post"]["actions"])[] = ["save", "tailor", "letter"];

// The sample person's details, and the file name the app gives their resume's PDF.
const FORM_FIELDS: readonly { key: keyof Words["form"]["fields"]; value: string; span: string }[] =
  [
    { key: "firstName", value: "Jordan", span: "col-span-1" },
    { key: "lastName", value: "Ellis", span: "col-span-1" },
    { key: "email", value: "jordan.ellis@example.com", span: "col-span-2 sm:col-span-1" },
    { key: "company", value: "Brightloop", span: "col-span-2 sm:col-span-1" },
    { key: "portfolio", value: "portfolio.example.com/jordan-ellis", span: "col-span-2" },
  ];
const RESUME_FILE = "Jordan-Ellis-Resume.pdf";
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

function PostMock({ t, format }: { t: Words["post"]; format: Format }) {
  const found = format.number(SKILLS.found);
  const total = format.number(SKILLS.total);
  const careers = fmt(t.careers, { company: COMPANY });
  return (
    <div role="img" aria-label={fmt(t.label, { title: t.title, found, total, missing: t.skill })}>
      <Window title={careers} meta={t.meta} bodyClassName="px-4 pt-5 pb-24 sm:px-6">
        <p className="text-lg/7 font-semibold text-ink">{t.title}</p>
        <p className="text-sm/6 text-muted">
          {COMPANY} · {t.where}
        </p>
        <p className="mt-5 text-sm/6 font-medium text-ink">{t.about}</p>
        <div className="mt-2 flex flex-col gap-2.5">
          <span className="h-2 w-11/12 rounded-full bg-surface-muted" />
          <span className="h-2 w-4/5 rounded-full bg-surface-muted" />
          <span className="h-2 w-2/3 rounded-full bg-surface-muted" />
        </div>
        <p className="mt-5 text-sm/6 font-medium text-ink">{t.bring}</p>
        <div className="mt-2 flex flex-col gap-2.5">
          <span className="h-2 w-5/6 rounded-full bg-surface-muted" />
          <span className="h-2 w-3/5 rounded-full bg-surface-muted" />
        </div>
      </Window>
      <OttoCard meta={careers}>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl/none font-semibold tracking-tight text-ink tabular-nums">
            {found}
          </span>
          <span className="text-sm text-muted">
            {rich(
              t.found,
              { b: (chunk) => <span className="font-medium text-ink">{chunk}</span> },
              { total },
            )}
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
          {rich(
            t.missing,
            { b: (chunk) => <mark className="highlighter text-ink">{chunk}</mark> },
            { skill: t.skill },
          )}
        </p>
        <div className="mt-3 flex gap-2">
          {ACTIONS.map((key, index) => (
            <span
              key={key}
              className={buttonClasses({
                variant: index === 0 ? "primary" : "secondary",
                size: "sm",
                className: cn(MOCK_KEY, "flex-1"),
              })}
            >
              {t.actions[key]}
            </span>
          ))}
        </div>
      </OttoCard>
    </div>
  );
}

function FormMock({ t, format }: { t: Words["form"]; format: Format }) {
  const question = fmt(t.question, { company: COMPANY });
  const filled = format.number(FILLED);
  return (
    <div role="img" aria-label={fmt(t.label, { company: COMPANY, filled, question })}>
      <Window
        title={fmt(t.window, { company: COMPANY })}
        meta={t.meta}
        bodyClassName="grid grid-cols-2 gap-3 px-4 pt-5 pb-28 sm:px-6"
      >
        <p className="col-span-2 text-base/6 font-semibold text-ink">{t.heading}</p>
        {FORM_FIELDS.map(({ key, value, span }) => (
          <div key={key} className={cn("flex min-w-0 flex-col gap-1", span)}>
            <span className="text-xs/4 font-medium text-ink">{t.fields[key]}</span>
            <span className={cn(FIELD, FILLED_FIELD)}>
              <span className="truncate">{value}</span>
            </span>
          </div>
        ))}
        <div className="col-span-2 flex min-w-0 flex-col gap-1">
          <span className="text-xs/4 font-medium text-ink">{t.resume}</span>
          <span className={cn(FIELD, FILLED_FIELD, "gap-1.5")}>
            <Paperclip aria-hidden className="size-3.5 shrink-0 text-muted" />
            <span className="truncate">{RESUME_FILE}</span>
          </span>
        </div>
        <div className="col-span-2 flex min-w-0 flex-col gap-1">
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs/4 font-medium text-ink">{question}</span>
            <span className="inline-flex h-6.5 shrink-0 items-center gap-1 rounded-full border border-border-control bg-surface pr-2.5 pl-1 text-xs font-medium text-ink shadow-control">
              <OttoMark className="size-4.5" />
              {t.draft}
            </span>
          </span>
          <span className={cn("rounded-lg border px-2.5 py-1.5 text-xs/5", FILLED_FIELD)}>
            {fmt(t.answer, { company: COMPANY })}
          </span>
        </div>
        <Eyebrow as="span" className="col-span-2 mt-2">
          {t.selfId}
        </Eyebrow>
        <div className="col-span-2 flex min-w-0 flex-col gap-1">
          <span className="text-xs/4 font-medium text-ink">{t.gender}</span>
          <span
            className={cn(FIELD, "justify-between border-border-strong bg-surface text-subtle")}
          >
            {t.select}
            <ChevronDown aria-hidden className="size-3.5" />
          </span>
        </div>
        <span className={buttonClasses({ size: "sm", className: cn(MOCK_KEY, "mt-2 w-fit px-3") })}>
          {t.submit}
        </span>
      </Window>
      <OttoCard meta="Greenhouse" className="-mt-24">
        <p className="mt-3 flex gap-2 text-sm/5 text-ink">
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-pass" />
          <span>
            {rich(
              t.filled,
              { b: (chunk) => <span className="font-medium">{chunk}</span> },
              { count: filled, file: RESUME_FILE },
            )}
          </span>
        </p>
        <p className="mt-2 flex gap-2 text-xs/5 text-muted">
          <Shield aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>{t.leftForYou}</span>
        </p>
        <p className="mt-2 text-xs/5 font-medium text-ink">{t.checkEvery}</p>
      </OttoCard>
    </div>
  );
}

export function ExtensionShowcase({ t, format }: Pick<HomeProps, "t" | "format">) {
  const words = t.extension;
  return (
    <Section
      id="chrome-extension"
      labelledBy="extension-showcase-title"
      lazySize="[contain-intrinsic-size:auto_2700px] sm:[contain-intrinsic-size:auto_2320px] lg:[contain-intrinsic-size:auto_1760px]"
    >
      <SectionHeader
        id="extension-showcase-title"
        eyebrow={CHROME_STORE_URL ? words.eyebrow : words.eyebrowSoon}
        title={words.title}
      >
        {words.intro}
      </SectionHeader>
      <Panel className="mt-12 grid items-start gap-8 sm:mt-16 lg:grid-cols-2 lg:gap-10">
        <div>
          <Eyebrow>{words.onPost}</Eyebrow>
          <div className="mt-3">
            <PostMock t={words.post} format={format} />
          </div>
        </div>
        <div>
          <Eyebrow>{words.onForm}</Eyebrow>
          <div className="mt-3">
            <FormMock t={words.form} format={format} />
          </div>
        </div>
      </Panel>
      <ul
        role="list"
        className="mt-10 grid gap-x-8 gap-y-8 border-t border-border pt-10 sm:grid-cols-2"
      >
        {POINTS.map((key) => (
          <li key={key} className="flex flex-col gap-2">
            <h3 className="text-lg/7 font-medium tracking-tight text-ink">
              {words.points[key].title}
            </h3>
            <p className="max-w-prose text-base/7 text-muted">
              {key === "tailor" || key === "fill"
                ? fmt(words.points[key].text, { plans: plansWith(format, key) })
                : words.points[key].text}
            </p>
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
          {words.addToChrome}
          <ArrowUpRight aria-hidden />
          <span className="sr-only">{words.newTab}</span>
        </a>
      ) : (
        <p className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-base/7 text-muted">
          <Badge>{words.comingSoon}</Badge>
          {words.notInStore}
        </p>
      )}
    </Section>
  );
}
