import type { Metadata } from "next";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { fmt } from "@/i18n/format";
import { getLocalize, localizedMetadata, requirePublished } from "@/i18n/publish";
import { getFormat, getLocale, getMessages } from "@/i18n/server";
import { PORTFOLIO_PAGE } from "@/lib/seo-pages/pages";
import { displayItalic } from "../_components/display-italic";
import { FeaturePage } from "../_components/feature-page";
import { priceCopy } from "../_components/price-copy";
import {
  PLAN_NAMES,
  productMeta,
  publishedRelated,
  relatedLinks,
  withTrial,
} from "../_components/product-copy";
import { portfolioContent } from "./content";

const PATH = PORTFOLIO_PAGE.path;

export async function generateMetadata(): Promise<Metadata> {
  const meta = productMeta(await getMessages("product"), await getFormat(), "portfolio");
  return localizedMetadata({ ...meta, path: PATH });
}

export default async function PortfolioWebsiteBuilderPage() {
  await requirePublished(PATH);
  const t = await getMessages("product");
  const format = await getFormat();
  const href = await getLocalize();
  const prices = priceCopy(await getMessages("pricing"), format);
  const page = t.portfolio;
  const related = await publishedRelated(["coverLetters", "tracker", "interviewPrep", "examples"]);
  return (
    <FeaturePage
      language={await getLocale()}
      t={t.common}
      href={href}
      path={PATH}
      crumb={page.crumb}
      eyebrow={fmt(page.eyebrow, { pro: PLAN_NAMES.pro })}
      title={
        <>
          {page.title} <em className={displayItalic.className}>{page.titleEm}</em>
        </>
      }
      content={portfolioContent(page, format, prices)}
      action={{ href: PORTFOLIO_ROUTE, label: page.action }}
      planNote={withTrial(
        t.common,
        prices,
        fmt(page.planNote, { pro: PLAN_NAMES.pro, price: prices.planPrice("pro", "month") }),
      )}
      check={page.check}
      closing={{ ...page.closing, pose: "wave" }}
      related={relatedLinks(t.related, format, href, related)}
    />
  );
}
