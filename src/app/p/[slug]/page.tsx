import type { Metadata, Viewport } from "next";
import { notFound, redirect } from "next/navigation";
import { PortfolioRuntime } from "@/components/portfolio/portfolio-runtime";
import { PortfolioViewBeacon } from "@/components/portfolio/view-beacon";
import { PORTFOLIO_TEMPLATES } from "@/components/portfolio/templates/registry";
import { JsonLd } from "@/components/site/json-ld";
import { BRAND } from "@/config/brand";
import { fmt } from "@/i18n/format";
import { loadMessages } from "@/i18n/messages";
import { profilePageJsonLd } from "@/lib/portfolio/json-ld";
import { loadPublicPortfolio, portfolioLocale } from "@/lib/portfolio/page";
import { normalizeSlug } from "@/lib/portfolio/slug";
import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import { DEFAULT_PORTFOLIO_TEMPLATE, portfolioPath } from "@/lib/portfolio/types";
import { portfolioDescription } from "@/lib/portfolio/view";
import { absoluteUrl } from "@/lib/seo/urls";

// Must stay a literal (= PORTFOLIO_REVALIDATE_SECONDS): Next reads it statically.
export const revalidate = 3600;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

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
  const { page } = await loadMessages(portfolioLocale(result), "portfolio");
  if (result.status !== "ok") return { title: { absolute: page.untitled }, robots: NO_INDEX };
  const { view, allowIndexing } = result.portfolio;
  const title = view.name ? fmt(page.title, { name: view.name }) : page.untitled;
  const description = portfolioDescription(view) || fmt(page.description, { brand: BRAND.name });
  return {
    title: { absolute: title },
    description,
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
  const jsonLd = profilePageJsonLd({
    view: portfolio.view,
    content: portfolio.content,
    template: portfolio.template,
    url: absoluteUrl(portfolioPath(portfolio.slug)),
    updatedAt: portfolio.updatedAt,
  });
  return (
    <main id="main" className="flex min-h-dvh flex-col">
      <PortfolioRuntime template={portfolio.template}>
        {jsonLd ? <JsonLd data={jsonLd} /> : null}
      </PortfolioRuntime>
      <Component
        view={portfolio.view}
        content={portfolio.content}
        resumeHref={portfolio.resumeHref}
      />
      <PortfolioViewBeacon slug={portfolio.slug} />
    </main>
  );
}
