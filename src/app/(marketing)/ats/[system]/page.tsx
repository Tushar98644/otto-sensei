import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntentLink } from "@/components/site/intent-link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import type { HiringNote } from "@/lib/ats/types";
import {
  ATS_GUIDES,
  ATS_IDS,
  GENERAL_ADVICE,
  type AtsGuide,
  atsGuide,
  guideHeadline,
  guideSources,
  isAtsId,
  readsFiles,
  TOPIC_TITLES,
  topicList,
} from "@/lib/seo-pages/ats";
import type { SystemNames } from "@/lib/seo-pages/job-link";
import { ATS_INDEX_PAGE, atsGuidePage } from "@/lib/seo-pages/pages";
import { SEO_PATHS, atsPath } from "@/lib/seo-pages/paths";
import { cn } from "@/lib/utils";
import {
  Breadcrumbs,
  CheckCta,
  ExternalLink,
  H2_CLASSES,
  LINK_CLASSES,
  PAGE_CLASSES,
  PageIntro,
} from "../_components/guide-parts";
import { JobLinkCheck } from "../_components/job-link-check";

export const dynamicParams = false;

export function generateStaticParams(): { system: string }[] {
  return ATS_IDS.map((system) => ({ system }));
}

type Props = { params: Promise<{ system: string }> };

async function guideFor(params: Props["params"]): Promise<AtsGuide> {
  const { system } = await params;
  if (!isAtsId(system)) notFound();
  return atsGuide(system);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata(atsGuidePage(await guideFor(params)));
}

const SYSTEM_NAMES = Object.fromEntries(
  ATS_GUIDES.map((guide) => [guide.id, guide.name]),
) as SystemNames;

const SMALL_TITLE_CLASSES = "font-sans text-lg/7 font-medium tracking-tight text-ink";

function NoteRow({ note, sourceLabel }: { note: HiringNote; sourceLabel: string }) {
  return (
    <li className="flex flex-col gap-2 py-6">
      <p className="text-base/7 text-pretty text-ink">{note.fact}</p>
      <p className="text-base/7 text-pretty text-muted">
        <span className="font-medium text-ink">What to do: </span>
        {note.todo}
      </p>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm/6 text-subtle">
        {note.optIn ? <span>Only if the employer turns it on</span> : null}
        <span>
          Source: <ExternalLink href={note.source.url}>{sourceLabel}</ExternalLink>
        </span>
      </p>
    </li>
  );
}

function SideCta({ name }: { name: string }) {
  return (
    <section
      aria-labelledby="side-cta-title"
      className="mb-10 hidden rounded-2xl bg-surface-muted p-6 lg:block"
    >
      <h2 id="side-cta-title" className={SMALL_TITLE_CLASSES}>
        Applying through {name}?
      </h2>
      <p className="mt-1 text-sm/6 text-pretty text-muted">
        See which of the job&apos;s skills your resume shows. Free, no sign-in.
      </p>
      <IntentLink
        href={SEO_PATHS.jobMatch}
        className={buttonClasses({ variant: "secondary", className: "mt-4 w-full" })}
      >
        Match my resume to a job
        <ArrowRight />
      </IntentLink>
      <IntentLink
        href={ROUTES.studio}
        className={cn(LINK_CLASSES, "mt-2 inline-flex min-h-9 items-center text-sm/6")}
      >
        Check my resume
      </IntentLink>
    </section>
  );
}

export default async function AtsGuidePage({ params }: Props) {
  const guide = await guideFor(params);
  const sources = guideSources(guide);
  const labels = new Map(sources.map((source) => [source.url, source.label]));
  const others = ATS_GUIDES.filter((other) => other.id !== guide.id);
  const count = guide.notes.length;
  return (
    <div className={PAGE_CLASSES}>
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: ROUTES.home },
          { name: "ATS guides", path: ATS_INDEX_PAGE.path },
          { name: guide.name, path: atsPath(guide.id) },
        ]}
      />
      <PageIntro eyebrow="ATS guide" title={guideHeadline(guide)}>
        <p>{guide.what}</p>
        <p className="text-sm/6 text-subtle">
          {count === 1
            ? "1 sourced note, linked to the page it comes from."
            : `${count} sourced notes, each linked to the page it comes from.`}{" "}
          Employers set {guide.name} up in different ways, so not every note applies to every job.
        </p>
      </PageIntro>

      <div className="mt-12 grid gap-16 sm:mt-16 lg:grid-cols-3 lg:gap-12">
        <div className="flex flex-col gap-16 lg:col-span-2">
          <section aria-labelledby="spot-title" className="rounded-3xl bg-surface-muted p-6 sm:p-8">
            <h2 id="spot-title" className={SMALL_TITLE_CLASSES}>
              How to tell a job uses {guide.name}
            </h2>
            <p className="mt-2 text-base/7 text-pretty text-muted">{guide.spot}</p>
            <JobLinkCheck className="mt-6" system={guide.id} names={SYSTEM_NAMES} />
          </section>

          {readsFiles(guide) ? null : (
            <section aria-labelledby="file-title">
              <h2 id="file-title" className={H2_CLASSES}>
                {TOPIC_TITLES.file}
              </h2>
              <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
                Otto&apos;s notes don&apos;t cover how {guide.name} reads files yet, so there&apos;s
                nothing sourced to share here. The{" "}
                <a href="#general-title" className={LINK_CLASSES}>
                  general advice
                </a>{" "}
                below is a safe start.
              </p>
            </section>
          )}

          {guide.sections.map((section) => (
            <section key={section.topic} aria-labelledby={`${section.topic}-title`}>
              <h2 id={`${section.topic}-title`} className={H2_CLASSES}>
                {section.title}
              </h2>
              <ul role="list" className="mt-6 divide-y divide-border border-y border-border">
                {section.notes.map((note) => (
                  <NoteRow
                    key={note.fact}
                    note={note}
                    sourceLabel={labels.get(note.source.url) ?? note.source.label}
                  />
                ))}
              </ul>
            </section>
          ))}

          <section aria-labelledby="general-title" className="scroll-mt-24">
            <h2 id="general-title" className={H2_CLASSES}>
              General advice for any hiring system
            </h2>
            <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
              Not specific to {guide.name}. These tips come up again and again in the notes Otto has
              on {ATS_GUIDES.length} hiring systems.
            </p>
            <ul role="list" className="mt-6 divide-y divide-border border-y border-border">
              {GENERAL_ADVICE.map((tip) => (
                <li key={tip.title} className="flex flex-col gap-1 py-6">
                  <h3 className="text-lg/7 font-medium tracking-tight text-ink">{tip.title}</h3>
                  <p className="max-w-prose text-base/7 text-pretty text-muted">{tip.text}</p>
                </li>
              ))}
            </ul>
          </section>

          <CheckCta />

          <section aria-labelledby="sources-title">
            <h2 id="sources-title" className={H2_CLASSES}>
              Sources
            </h2>
            <ul role="list" className="mt-6 flex flex-col gap-3 text-base/7">
              {sources.map((source) => (
                <li key={source.url} className="flex flex-col">
                  <ExternalLink href={source.url}>{source.label}</ExternalLink>
                  <span className="text-sm/6 text-pretty text-subtle">
                    {new URL(source.url).hostname}
                    {source.byTopic ? null : ` · on ${topicList(source.topics)}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside aria-label="Next steps and more guides" className="lg:sticky lg:top-24 lg:self-start">
          <SideCta name={guide.name} />
          <h2 id="more-title" className={SMALL_TITLE_CLASSES}>
            More ATS guides
          </h2>
          <ul role="list" aria-labelledby="more-title" className="mt-3 grid grid-cols-2 gap-x-6">
            {others.map((other) => (
              <li key={other.id}>
                <IntentLink
                  href={atsPath(other.id)}
                  className="inline-flex min-h-11 items-center rounded-sm text-base/6 text-muted transition-colors hover:text-ink lg:min-h-9"
                >
                  {other.name}
                </IntentLink>
              </li>
            ))}
          </ul>
          <ul
            role="list"
            className="mt-6 flex flex-col gap-2 border-t border-border pt-6 text-sm/6"
          >
            <li>
              <IntentLink href={SEO_PATHS.resumeTemplates} className={LINK_CLASSES}>
                Resume templates in one column of real text
              </IntentLink>
            </li>
            <li>
              <IntentLink href={SEO_PATHS.compare} className={LINK_CLASSES}>
                How Otto compares with other tools
              </IntentLink>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
