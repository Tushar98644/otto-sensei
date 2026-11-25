import {
  FileText,
  Globe,
  Inbox,
  MessagesSquare,
  Puzzle,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Squiggle } from "@/components/doodles/doodles";
import { Eyebrow } from "@/components/ui/eyebrow";
import { fmt } from "@/i18n/format";
import type { Localize } from "@/i18n/pages";
import { rich } from "@/i18n/rich";
import { CHROME_STORE_URL } from "@/lib/extension/store";
import { countClaimWith, type JobCounts } from "@/lib/job-feed/counts";
import { SEO_PATHS } from "@/lib/seo-pages/paths";
import { cn } from "@/lib/utils";
import { displayItalic } from "./display-italic";
import { HeroCta, type HeroCtaCopy } from "./hero-cta";
import { HeroDemo } from "./hero-demo";
import type { HomeMessages, HomeProps } from "./home-copy";
import { PAUSE_OFFSCREEN } from "./section";

export function heroCtaCopy(t: HomeMessages, href: Localize): HeroCtaCopy {
  const { noSignup, another, jobPost } = t.hero;
  return { cta: t.cta, noSignup, another, jobPost, jobMatch: href(SEO_PATHS.jobMatch) };
}

type HeroFeature = { href: string; label: string; icon: LucideIcon };

export function heroFeatures(
  t: HomeMessages["hero"]["features"],
  open: string | null,
): HeroFeature[] {
  return [
    { href: "#how", label: t.checker, icon: FileText },
    { href: "#jobs", label: open ? fmt(t.jobs, { count: open }) : t.jobsNoCount, icon: Search },
    { href: "#email-tracking", label: t.emailTracking, icon: Inbox },
    { href: "#interview-prep", label: t.interviewPrep, icon: MessagesSquare },
    { href: "#portfolio", label: t.portfolio, icon: Globe },
    {
      href: "#chrome-extension",
      label: CHROME_STORE_URL ? t.extension : t.extensionSoon,
      icon: Puzzle,
    },
  ];
}

export function Hero({ t, format, href, jobCounts }: HomeProps & { jobCounts: JobCounts }) {
  const hero = t.hero;
  const open = countClaimWith((value) => format.number(value), jobCounts.open);
  return (
    <section
      aria-labelledby="hero-title"
      data-pause=""
      className={cn("overflow-x-clip", PAUSE_OFFSCREEN)}
    >
      <div className="container-page pt-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Eyebrow>{hero.eyebrow}</Eyebrow>
          <h1
            id="hero-title"
            className="mt-4 font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none lg:text-8xl/none"
          >
            {hero.title}{" "}
            <em className={cn("block", displayItalic.className)}>
              {rich(hero.titleEm, {
                b: (chunk) => (
                  <span className="relative whitespace-nowrap">
                    {chunk}
                    <Squiggle className="absolute inset-x-0 top-4/5 h-auto w-full" />
                  </span>
                ),
              })}
            </em>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg/7 text-balance text-muted sm:text-xl/8">
            <span className="sm:block">{hero.lead.check}</span>{" "}
            <span className="sm:block">{hero.lead.track}</span>
          </p>
          <ul
            aria-label={hero.featuresLabel}
            className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2"
          >
            {heroFeatures(hero.features, open).map((feature) => (
              <li key={feature.label}>
                <a
                  href={feature.href}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-control bg-surface px-3 text-sm text-ink shadow-control transition-colors hover:bg-surface-hover"
                >
                  <feature.icon aria-hidden className="size-3.5 text-muted" />
                  {feature.label}
                </a>
              </li>
            ))}
          </ul>
          <HeroCta copy={heroCtaCopy(t, href)} />
        </div>
        <HeroDemo t={t} className="mt-10" />
      </div>
    </section>
  );
}
