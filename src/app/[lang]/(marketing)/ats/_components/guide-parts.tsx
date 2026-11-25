import { ArrowRight, ArrowUpRight, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { IntentLink } from "@/components/site/intent-link";
import { JsonLd } from "@/components/site/json-ld";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { Localize } from "@/i18n/pages";
import { appUrl } from "@/lib/env";
import { type Crumb, breadcrumbJsonLd } from "@/lib/seo-pages/json-ld";
import type { RelatedLink } from "@/lib/seo-pages/pages";
import { SEO_PATHS } from "@/lib/seo-pages/paths";
import { cn } from "@/lib/utils";

export const PAGE_CLASSES = "container-page pt-8 pb-24 sm:pt-12 sm:pb-32";
export const H2_CLASSES =
  "font-display text-3xl/9 font-normal tracking-tight text-balance text-ink sm:text-4xl/10";
export const LINK_CLASSES =
  "rounded-sm font-medium text-ink underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-ink";

// Labels default to English for the guides (P5); translated pages pass their own, and their links through href().
export function Breadcrumbs({
  crumbs,
  label = "Breadcrumb",
  language,
}: {
  crumbs: readonly Crumb[];
  label?: string;
  language?: string;
}) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs, appUrl(), language)} />
      <nav aria-label={label}>
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm/6 text-subtle">
          {crumbs.map((crumb, index) => {
            const current = index === crumbs.length - 1;
            return (
              <li key={crumb.path} className="flex items-center gap-1">
                {current ? (
                  <span aria-current="page" className="text-muted">
                    {crumb.name}
                  </span>
                ) : (
                  <>
                    <IntentLink
                      href={crumb.path}
                      className="inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-ink sm:min-h-8"
                    >
                      {crumb.name}
                    </IntentLink>
                    <ChevronRight aria-hidden className="size-3.5 shrink-0" />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

export type PageIntroProps = {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function PageIntro({ eyebrow, title, children, className }: PageIntroProps) {
  return (
    <header className={cn("mt-8 flex max-w-3xl flex-col sm:mt-12", className)}>
      <Eyebrow className="mb-4">{eyebrow}</Eyebrow>
      <h1 className="font-display text-5xl/none font-normal tracking-tight text-balance text-ink sm:text-6xl/none">
        {title}
      </h1>
      {children ? (
        <div className="mt-6 flex max-w-2xl flex-col gap-3 text-lg/7 text-pretty text-muted sm:text-xl/8">
          {children}
        </div>
      ) : null}
    </header>
  );
}

export function ExternalLink({
  href,
  children,
  newTab = "(opens in a new tab)",
}: {
  href: string;
  children: ReactNode;
  newTab?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(LINK_CLASSES, "inline-flex items-center gap-0.5 font-normal")}
    >
      {children}
      <ArrowUpRight aria-hidden className="size-3.5 shrink-0" />
      <span className="sr-only">{` ${newTab}`}</span>
    </a>
  );
}

export type CheckCtaProps = {
  title?: string;
  children?: ReactNode;
  className?: string;
} & CheckButtonsProps;

export function CheckCta({
  title = "See how your resume reads",
  children = "Compare your resume with a job post, or see the text hiring software pulls from your file. Both are free, with no card.",
  className,
  labels,
  href,
}: CheckCtaProps) {
  return (
    <section
      aria-labelledby="check-cta-title"
      className={cn("rounded-3xl bg-surface-muted px-6 py-12 sm:px-12 sm:py-16", className)}
    >
      <h2 id="check-cta-title" className={H2_CLASSES}>
        {title}
      </h2>
      <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">{children}</p>
      <CheckButtons className="mt-8" labels={labels} href={href} />
    </section>
  );
}

export type CheckButtonsProps = {
  labels?: { match: string; check: string };
  href?: Localize;
};

const ENGLISH_CHECK_LABELS = { match: "Match my resume to a job", check: "Check my resume" };

export function CheckButtons({
  className,
  labels = ENGLISH_CHECK_LABELS,
  href = (path) => path,
}: { className?: string } & CheckButtonsProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
      <IntentLink
        href={href(SEO_PATHS.jobMatch)}
        className={buttonClasses({ size: "lg", className: "w-full sm:w-auto" })}
      >
        {labels.match}
        <ArrowRight />
      </IntentLink>
      <IntentLink
        href={href(ROUTES.studio)}
        className={buttonClasses({
          variant: "secondary",
          size: "lg",
          className: "w-full sm:w-auto",
        })}
      >
        {labels.check}
      </IntentLink>
    </div>
  );
}

export function RelatedLinks({
  title = "Keep reading",
  links,
  className,
}: {
  title?: string;
  links: readonly RelatedLink[];
  className?: string;
}) {
  return (
    <section aria-labelledby="related-title" className={className}>
      <h2 id="related-title" className={H2_CLASSES}>
        {title}
      </h2>
      <ul role="list" className="mt-8 divide-y divide-border border-y border-border">
        {links.map((link) => (
          <li key={link.href}>
            <IntentLink
              href={link.href}
              className="group flex min-h-16 items-center justify-between gap-6 rounded-lg py-5"
            >
              <span className="flex flex-col gap-1">
                <span className="text-lg/7 font-medium tracking-tight text-ink underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-border-strong">
                  {link.title}
                </span>
                <span className="text-base/7 text-pretty text-muted">{link.text}</span>
              </span>
              <ArrowRight aria-hidden className="size-5 shrink-0 text-muted" />
            </IntentLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
