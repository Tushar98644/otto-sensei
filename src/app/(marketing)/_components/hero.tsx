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
import { CHROME_STORE_URL } from "@/lib/extension/store";
import { countClaim, type JobCounts } from "@/lib/job-feed/counts";
import { cn } from "@/lib/utils";
import { displayItalic } from "./display-italic";
import { HeroCta } from "./hero-cta";
import { HeroDemo } from "./hero-demo";
import { PAUSE_OFFSCREEN } from "./section";

type HeroFeature = { href: string; label: string; icon: LucideIcon };

export function heroFeatures(open: string | null): HeroFeature[] {
  return [
    { href: "#how", label: "Resume checker", icon: FileText },
    { href: "#jobs", label: open ? `${open} open jobs` : "Open jobs", icon: Search },
    { href: "#email-tracking", label: "Email tracking", icon: Inbox },
    { href: "#features", label: "Interview prep", icon: MessagesSquare },
    { href: "#portfolio", label: "Portfolio site", icon: Globe },
    {
      href: "#chrome-extension",
      label: CHROME_STORE_URL ? "Chrome extension" : "Chrome extension, soon",
      icon: Puzzle,
    },
  ];
}

export function Hero({ jobCounts }: { jobCounts: JobCounts }) {
  const open = countClaim(jobCounts.open);
  return (
    <section
      aria-labelledby="hero-title"
      data-pause=""
      className={cn("overflow-x-clip", PAUSE_OFFSCREEN)}
    >
      <div className="container-page pt-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Eyebrow>Free to start</Eyebrow>
          <h1
            id="hero-title"
            className="mt-4 font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none lg:text-8xl/none"
          >
            Your whole job hunt,{" "}
            <em className={cn("block", displayItalic.className)}>
              in{" "}
              <span className="relative whitespace-nowrap">
                one place
                <Squiggle className="absolute inset-x-0 top-4/5 h-auto w-full" />
              </span>
              .
            </em>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg/7 text-balance text-muted sm:text-xl/8">
            <span className="sm:block">
              Check and fix your resume, then find jobs ranked for it.
            </span>{" "}
            <span className="sm:block">
              Track applications, prep for interviews, share a portfolio.
            </span>
          </p>
          <ul
            aria-label="What Otto does"
            className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2"
          >
            {heroFeatures(open).map((feature) => (
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
          <HeroCta />
        </div>
        <HeroDemo className="mt-10" />
      </div>
    </section>
  );
}
