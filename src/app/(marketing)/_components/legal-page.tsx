import { ChevronDown } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { LEGAL_LAST_UPDATED } from "@/components/site/routes";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LegalContents, type ContentsEntry } from "./legal-contents";

export type LegalSection = { title: string; body: ReactNode };

export type LegalPageProps = {
  title: string;
  intro?: ReactNode;
  summary?: readonly ReactNode[];
  action?: ReactNode;
  sections: readonly LegalSection[];
};

export const SHORT_VERSION: ContentsEntry = { id: "short-version", title: "The short version" };

// "main" is the skip link's target, so no section may take it.
const RESERVED_IDS = ["main", SHORT_VERSION.id];

// A plain calendar date: format it in UTC, or zones west of UTC show the day before.
const LAST_UPDATED_LABEL = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
}).format(new Date(`${LEGAL_LAST_UPDATED}T00:00:00Z`));

export function headingId(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function withHeadingIds<T extends { title: string }>(
  items: readonly T[],
): Array<T & { id: string }> {
  const seen = new Map<string, number>(RESERVED_IDS.map((id) => [id, 1]));
  return items.map((item) => {
    const base = headingId(item.title) || "section";
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { ...item, id: count === 1 ? base : `${base}-${count}` };
  });
}

function ShortVersion({ items, action }: { items: readonly ReactNode[]; action?: ReactNode }) {
  return (
    <section
      aria-labelledby={SHORT_VERSION.id}
      className="mt-8 rounded-3xl bg-surface-muted p-6 sm:p-8"
    >
      <h2
        id={SHORT_VERSION.id}
        className="scroll-mt-24 font-display text-2xl/8 font-normal text-ink"
      >
        {SHORT_VERSION.title}
      </h2>
      <ul className="mt-4 flex list-disc flex-col gap-2 pl-6 text-base/7 text-ink marker:text-subtle">
        {items.map((item, index) => (
          <li key={index} className="pl-1 text-pretty">
            {item}
          </li>
        ))}
      </ul>
      {action ? <div className="mt-6 flex flex-wrap gap-3">{action}</div> : null}
    </section>
  );
}

export function LegalPage({ title, intro, summary, action, sections }: LegalPageProps) {
  const headed = withHeadingIds(sections);
  const contents: ContentsEntry[] = [
    ...(summary ? [SHORT_VERSION] : []),
    ...headed.map(({ id, title }) => ({ id, title })),
  ];
  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mx-auto max-w-[68ch] lg:grid lg:max-w-none lg:grid-cols-[13rem_minmax(0,68ch)] lg:justify-center lg:gap-12">
        <nav
          aria-label="Contents"
          className="sticky top-24 hidden max-h-[calc(100dvh-8rem)] self-start overflow-y-auto lg:block"
        >
          <Eyebrow className="px-2.5 pb-2">Contents</Eyebrow>
          <LegalContents entries={contents} />
        </nav>
        <article className="min-w-0">
          <h1 className="font-display text-4xl/10 font-normal tracking-tight text-balance text-ink sm:text-5xl/13">
            {title}
          </h1>
          <p className="mt-3 text-sm/5 text-subtle">
            Last updated: <time dateTime={LEGAL_LAST_UPDATED}>{LAST_UPDATED_LABEL}</time>
          </p>
          <details className="group mt-6 border-y border-border lg:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm/6 font-medium text-ink [&::-webkit-details-marker]:hidden">
              Contents
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
              />
            </summary>
            <nav aria-label="Contents" className="-mx-2.5 pb-3">
              <LegalContents entries={contents} />
            </nav>
          </details>
          {intro ? <div className="prose-otto mt-8">{intro}</div> : null}
          {summary ? <ShortVersion items={summary} action={action} /> : null}
          <div className="prose-otto mt-10">
            {headed.map((section) => (
              <Fragment key={section.id}>
                <h2 id={section.id} className="scroll-mt-24">
                  {section.title}
                </h2>
                {section.body}
              </Fragment>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
