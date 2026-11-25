import type { Metadata } from "next";
import { ROUTES } from "@/components/site/routes";
import { fmt } from "@/i18n/format";
import { getLocalize, localizedMetadata, requirePublished } from "@/i18n/publish";
import { getFormat, getLocale, getMessages } from "@/i18n/server";
import { TRACKER_PAGE } from "@/lib/seo-pages/pages";
import { displayItalic } from "../_components/display-italic";
import { FeaturePage } from "../_components/feature-page";
import { priceCopy } from "../_components/price-copy";
import {
  productMeta,
  publishedRelated,
  relatedLinks,
  withTrial,
} from "../_components/product-copy";
import { trackerContent, trackerLimits } from "./content";

const PATH = TRACKER_PAGE.path;

export async function generateMetadata(): Promise<Metadata> {
  const meta = productMeta(await getMessages("product"), await getFormat(), "tracker");
  return localizedMetadata({ ...meta, path: PATH });
}

export default async function JobApplicationTrackerPage() {
  await requirePublished(PATH);
  const t = await getMessages("product");
  const format = await getFormat();
  const href = await getLocalize();
  const prices = priceCopy(await getMessages("pricing"), format);
  const page = t.tracker;
  const related = await publishedRelated([
    "coverLetters",
    "interviewPrep",
    "portfolio",
    "examples",
  ]);
  return (
    <FeaturePage
      language={await getLocale()}
      t={t.common}
      href={href}
      path={PATH}
      crumb={page.crumb}
      eyebrow={page.eyebrow}
      title={
        <>
          {page.title} <em className={displayItalic.className}>{page.titleEm}</em>
        </>
      }
      content={trackerContent(page, format, href, prices)}
      action={{ href: ROUTES.dashboardApplications, label: page.action }}
      planNote={withTrial(t.common, prices, fmt(page.planNote, trackerLimits(page, format)))}
      check={page.check}
      closing={{ ...page.closing, pose: "read" }}
      related={relatedLinks(t.related, format, href, related)}
    />
  );
}
