import type { ReactNode } from "react";
import type { ContentImage, PortfolioContentView, TextPart } from "@/lib/portfolio/content";
import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import type { PortfolioTemplateId } from "@/lib/portfolio/types";
import type { PortfolioView } from "@/lib/portfolio/view";

// Small pieces the templates share. No hooks and no browser APIs: templates render on the server
// for /p/<slug> and in the browser for the editor's preview.

/** A template's scoped stylesheet (see ./css.ts). Constant CSS from its folder, never user text. */
export function TemplateStyle({ css }: { css: string }) {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

// Links on someone's page lead away from it; they get no referrer and no ranking credit from us.
export function OutLink({
  href,
  className,
  label,
  children,
}: {
  href: string | null;
  className?: string;
  // The link's accessible name when it only shows an icon.
  label?: string;
  children: ReactNode;
}) {
  if (!href) return <span className={className}>{children}</span>;
  if (!/^https?:/i.test(href)) {
    return (
      <a href={href} className={className} aria-label={label}>
        {children}
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className={className}
      aria-label={label}
    >
      {children}
    </a>
  );
}

/**
 * The footer line every template carries for the design it rebuilds: "Design based on Brittany
 * Chiang's v4 (MIT)", linking to the original. Shown even when the "Made with" credit is off.
 */
export function DesignCredit({ id }: { id: PortfolioTemplateId }) {
  const { author, work, href, licence } = PORTFOLIO_TEMPLATE_INFO[id].credit;
  return (
    <p className="design-credit">
      Design based on{" "}
      <a href={href} target="_blank" rel="noopener noreferrer">
        {author}&rsquo;s {work}
      </a>{" "}
      ({licence})
    </p>
  );
}

/**
 * A picture from the content view. Its address was checked when the view was built (an upload on
 * our media host, or an https link); it loads without a referrer so linked hosts can't track
 * readers back to the page.
 */
export function Picture({
  image,
  className,
  alt,
  eager = false,
}: {
  image: ContentImage;
  className?: string;
  alt?: string;
  eager?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- uploads and linked https pictures; next/image would proxy every linked host
    <img
      src={image.src}
      alt={alt ?? image.alt}
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
    />
  );
}

/** A paragraph with the owner's highlighted phrases wrapped in `mark` (a <strong> by default). */
export function Marked({
  parts,
  mark = "strong",
  className,
}: {
  parts: readonly TextPart[];
  mark?: "strong" | "em" | "span";
  className?: string;
}) {
  const Mark = mark;
  return parts.map((part, index) =>
    part.mark ? (
      <Mark key={index} className={className}>
        {part.text}
      </Mark>
    ) : (
      part.text
    ),
  );
}

/** Where "Say hello" goes: the email when it's shown, else the first social link, else nothing. */
export function contactHref(content: PortfolioContentView): string | null {
  if (content.email) return `mailto:${content.email}`;
  return content.socials.find((social) => social.kind !== "email")?.href ?? null;
}

/** An element id from a project id ("gh:octo/repo" becomes "gh-octo-repo"), prefixed. */
export function safeId(prefix: string, id: string): string {
  const tail = id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${prefix}-${tail || "item"}`;
}

/** Featured projects first, then the rest, each half in the owner's order. */
export function featuredFirst<T extends { featured: boolean }>(items: readonly T[]): T[] {
  return [...items.filter((item) => item.featured), ...items.filter((item) => !item.featured)];
}

/** Every skill in order, flattened out of its groups, without repeats. */
export function allSkills(view: PortfolioView): string[] {
  return [...new Set(view.skills.flatMap((group) => group.items))];
}

/** The page's name, or a plain word when the resume has none yet. */
export function nameOf(view: PortfolioView): string {
  return view.name || "Portfolio";
}
