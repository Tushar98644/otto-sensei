import type { Metadata } from "next";
import { ROUTES } from "@/components/site/routes";
import { PLANS } from "@/config/plans";
import { fmt } from "@/i18n/format";
import { getLocalize, localizedMetadata, requirePublished } from "@/i18n/publish";
import { getFormat, getLocale, getMessages } from "@/i18n/server";
import { COVER_LETTER_PAGE } from "@/lib/seo-pages/pages";
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
import { letterContent } from "./content";

const PATH = COVER_LETTER_PAGE.path;

export async function generateMetadata(): Promise<Metadata> {
  const meta = productMeta(await getMessages("product"), await getFormat(), "coverLetters");
  return localizedMetadata({ ...meta, path: PATH });
}

export default async function CoverLetterGeneratorPage() {
  await requirePublished(PATH);
  const t = await getMessages("product");
  const format = await getFormat();
  const href = await getLocalize();
  const prices = priceCopy(await getMessages("pricing"), format);
  const page = t.coverLetters;
  const related = await publishedRelated(["tracker", "interviewPrep", "portfolio", "examples"]);
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
      content={letterContent(page, format, href, prices)}
      action={{ href: ROUTES.dashboardLetters, label: page.action }}
      planNote={withTrial(
        t.common,
        prices,
        fmt(page.planNote, {
          pro: PLAN_NAMES.pro,
          price: prices.planPrice("pro", "month"),
          letters: format.number(PLANS.pro.limits.letter),
        }),
      )}
      check={page.check}
      closing={{ ...page.closing, pose: "point" }}
      related={relatedLinks(t.related, format, href, related)}
    />
  );
}
