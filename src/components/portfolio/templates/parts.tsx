import type { ReactNode } from "react";
import type { PortfolioContentView, TextPart } from "@/lib/portfolio/content";
import type { PortfolioView } from "@/lib/portfolio/view";

// Constant CSS from the template's folder, never user text.
export function TemplateStyle({ css }: { css: string }) {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export function OutLink({
  href,
  className,
  label,
  children,
}: {
  href: string | null;
  className?: string;
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

// FNV-1a: deterministic, so server and browser draw the same pattern.
export function seedOf(text: string): number {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

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

export function contactHref(content: PortfolioContentView): string | null {
  if (content.email) return `mailto:${content.email}`;
  return content.socials.find((social) => social.kind !== "email")?.href ?? null;
}

export function safeId(prefix: string, id: string): string {
  const tail = id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${prefix}-${tail || "item"}`;
}

export function featuredFirst<T extends { featured: boolean }>(items: readonly T[]): T[] {
  return [...items.filter((item) => item.featured), ...items.filter((item) => !item.featured)];
}

export function allSkills(view: PortfolioView): string[] {
  return [...new Set(view.skills.flatMap((group) => group.items))];
}

export function unbroken(date: string): string {
  return date.replace(/ /g, "\u00a0");
}

export function nameOf(view: PortfolioView): string {
  return view.name || "Portfolio";
}
