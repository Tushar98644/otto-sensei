import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

export type SectionProps = {
  id?: string;
  // Id of the section's heading, so the region is named for screen readers.
  labelledBy: string;
  className?: string;
  children: ReactNode;
};

// One paper background for the whole page: sections are told apart by space and type, never by
// white bands or rules between them. Top padding only, so two sections never stack their gaps.
export function Section({ id, labelledBy, className, children }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      // Keeps in-page jumps (/#how) from tucking the section under the sticky header.
      className={cn("scroll-mt-16 pt-24 sm:pt-32", className)}
    >
      <div className="container-page">{children}</div>
    </section>
  );
}

export type SectionHeaderProps = {
  // Becomes the <h2> id; pass the same value as the Section's labelledBy.
  id: string;
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  // Left-aligned by default. Only the hero and the final call to action are centered, so the
  // page doesn't repeat one centered stack all the way down.
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

export type MomentCaptionProps = {
  title: ReactNode;
  children: ReactNode;
  // h3 when the caption names a step of a list (How it works); a plain line otherwise.
  titleAs?: "h3" | "p";
  titleId?: string;
  // A small Otto doing this step, beside its name. Decorative.
  otto?: ReactNode;
};

// Under a product view: what it shows on the left, a plain sentence about it on the right.
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
