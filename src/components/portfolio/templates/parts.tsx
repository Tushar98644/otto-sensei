import type { ReactNode } from "react";
import type { PortfolioContentView, TextPart } from "@/lib/portfolio/content";
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
 * A steady number from some text (FNV-1a), so a pattern or colour drawn for a project is the same
 * on every render, on the server and in the browser. Pages draw no pictures; this is what makes
 * each project's drawn stand-in its own.
 */
export function seedOf(text: string): number {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** A small pseudo-random sequence from a seed (mulberry32): values in [0, 1). */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

/** A date with no-break spaces, so a range that wraps breaks at its dash, never inside "May 2024". */
export function unbroken(date: string): string {
  return date.replace(/ /g, "\u00a0");
}

/** The page's name, or a plain word when the resume has none yet. */
export function nameOf(view: PortfolioView): string {
  return view.name || "Portfolio";
}
