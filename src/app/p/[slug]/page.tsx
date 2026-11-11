import type { Metadata, Viewport } from "next";
import { notFound, redirect } from "next/navigation";
import { templateFontClasses } from "@/components/portfolio/templates/fonts";
import { PORTFOLIO_TEMPLATES } from "@/components/portfolio/templates/registry";
import { PortfolioViewBeacon } from "@/components/portfolio/view-beacon";
import { JsonLd } from "@/components/site/json-ld";
import { BRAND } from "@/config/brand";
import { profilePageJsonLd } from "@/lib/portfolio/json-ld";
import { loadPublicPortfolio } from "@/lib/portfolio/page";
import { normalizeSlug } from "@/lib/portfolio/slug";
import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import { DEFAULT_PORTFOLIO_TEMPLATE, portfolioPath } from "@/lib/portfolio/types";
import { portfolioDescription } from "@/lib/portfolio/view";
import { absoluteUrl } from "@/lib/seo/urls";
import { cn } from "@/lib/utils";

// Every write drops the cache (src/lib/portfolio/cache.ts), else hourly. Must stay a literal
// (PORTFOLIO_REVALIDATE_SECONDS) for Next to read it.
export const revalidate = 3600;

// No pages at build time; each address is rendered on its first visit.
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

// The browser bar takes the template's own background (Navy's is dark blue). Same cached lookup
// as the page.
export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { slug } = await params;
  const result = await loadPublicPortfolio(slug);
  const template = result.status === "ok" ? result.portfolio.template : DEFAULT_PORTFOLIO_TEMPLATE;
  return { themeColor: PORTFOLIO_TEMPLATE_INFO[template].colors.background };
}

const NO_INDEX: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadPublicPortfolio(slug);
  if (result.status !== "ok") return { title: { absolute: "Portfolio" }, robots: NO_INDEX };
  const { view, allowIndexing } = result.portfolio;
  const title = view.name ? `${view.name} - Portfolio` : "Portfolio";
  const description = portfolioDescription(view) || `A portfolio made with ${BRAND.name}.`;
  return {
    title: { absolute: title },
    description,
    // Off until the owner turns on "Let search engines find it".
    robots: allowIndexing ? { index: true, follow: true } : NO_INDEX,
    alternates: allowIndexing ? { canonical: portfolioPath(slug) } : undefined,
    openGraph: { type: "profile", title, description, url: portfolioPath(slug) },
    twitter: { card: "summary_large_image", title, description },
  };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function PublicPortfolioPage({ params }: Props) {
  const { slug } = await params;
  // "/p/Maya-Chen" and "/p/maya%20chen" are the same page as "/p/maya-chen".
  const canonical = normalizeSlug(safeDecode(slug));
  if (canonical !== slug) {
    if (canonical) redirect(portfolioPath(canonical));
    notFound();
  }
  const result = await loadPublicPortfolio(slug);
  if (result.status === "redirect") redirect(portfolioPath(result.slug));
  if (result.status === "missing") notFound();
  const { portfolio } = result;
  const { Component } = PORTFOLIO_TEMPLATES[portfolio.template];
  // On every published page, indexed or not: it repeats what any visitor already sees.
  const jsonLd = profilePageJsonLd({
    view: portfolio.view,
    content: portfolio.content,
    template: portfolio.template,
    url: absoluteUrl(portfolioPath(portfolio.slug)),
    updatedAt: portfolio.updatedAt,
  });
  // No site chrome: the page is the template's own canvas, edge to edge, and belongs to its owner.
  return (
    <main
      id="main"
      className={cn("flex min-h-dvh flex-col", templateFontClasses(portfolio.template))}
    >
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <Component view={portfolio.view} content={portfolio.content} />
      <PortfolioViewBeacon slug={portfolio.slug} />
    </main>
  );
}
