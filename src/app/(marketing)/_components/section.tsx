import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

export type SectionProps = {
  id?: string;
  labelledBy: string;
  className?: string;
  children: ReactNode;
};

export function Section({ id, labelledBy, className, children }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("scroll-mt-16 pt-24 sm:pt-32", className)}
    >
      <div className="container-page">{children}</div>
    </section>
  );
}

export type SectionHeaderProps = {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  align?: "center" | "start";
  className?: string;
};

export const SECTION_TITLE_CLASSES =
  "font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13";

export function SectionHeader({
  id,
  eyebrow,
  title,
  children,
  align = "start",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex max-w-2xl flex-col",
        align === "center" && "mx-auto items-center text-center",
        className,
      )}
    >
      {eyebrow ? <Eyebrow className="mb-4">{eyebrow}</Eyebrow> : null}
      <h2 id={id} className={SECTION_TITLE_CLASSES}>
        {title}
      </h2>
      {children ? (
        <p className="mt-4 max-w-prose text-lg/7 text-muted sm:text-xl/8">{children}</p>
      ) : null}
    </div>
  );
}

export type SectionLinkProps = { href: string; children: ReactNode; aside?: ReactNode };

// A ghost key whose label lines up with the text above: -ml-4.25 takes back its px-4 and 1px border.
export function SectionLink({ href, children, aside }: SectionLinkProps) {
  const link = (
    <Link
      href={href}
      className={buttonClasses({ variant: "ghost", className: cn("-ml-4.25", !aside && "mt-6") })}
    >
      {children}
      <ArrowRight />
    </Link>
  );
  if (!aside) return link;
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1">
      {link}
      <p className="text-sm/5 text-subtle">{aside}</p>
    </div>
  );
}

export type MomentCaptionProps = {
  title: ReactNode;
  children: ReactNode;
  titleAs?: "h3" | "p";
  titleId?: string;
  otto?: ReactNode;
};

export function MomentCaption({
  title,
  children,
  titleAs: Title = "p",
  titleId,
  otto,
}: MomentCaptionProps) {
  const name = (
    <Title id={titleId} className="text-lg/7 font-medium tracking-tight text-ink">
      {title}
    </Title>
  );
  return (
    <div className="mt-6 grid gap-2 sm:grid-cols-2 sm:gap-8">
      {otto ? (
        <div className="flex items-center gap-3">
          <span aria-hidden className="shrink-0">
            {otto}
          </span>
          {name}
        </div>
      ) : (
        name
      )}
      <p className="text-base/7 text-muted">{children}</p>
    </div>
  );
}
