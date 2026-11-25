import { describe, expect, it } from "vitest";
import { formatFor } from "@/i18n/intl";
import { englishMessages } from "@/i18n/messages";
import { PREP_LEVELS } from "@/lib/insights/prep-focus";
import {
  COVER_LETTER_PAGE,
  INTERVIEW_PREP_PAGE,
  PORTFOLIO_PAGE,
  RELATED,
  RESUME_BUILDER_PAGE,
  TRACKER_PAGE,
  type SeoPage,
} from "@/lib/seo-pages/pages";
import { TONE_CHOICES } from "@/lib/writing-style/schema";
import { productMeta, relatedLinks, type ProductPage, type RelatedKey } from "./product-copy";

const { product } = englishMessages();
const format = formatFor("en");

const PAGES: [ProductPage, SeoPage][] = [
  ["builder", RESUME_BUILDER_PAGE],
  ["coverLetters", COVER_LETTER_PAGE],
  ["tracker", TRACKER_PAGE],
  ["interviewPrep", INTERVIEW_PREP_PAGE],
  ["portfolio", PORTFOLIO_PAGE],
];

describe("product page copy in English", () => {
  it.each(PAGES)("titles and describes %s as llms.txt and the sitemap do", (page, seo) => {
    const { title, absoluteTitle, description } = seo;
    expect(productMeta(product, format, page)).toEqual({
      title,
      ...(absoluteTitle ? { absoluteTitle } : {}),
      description,
    });
  });

  it("words each related link as pages.ts does", () => {
    const keys = Object.keys(product.related) as RelatedKey[];
    expect(relatedLinks(product.related, format, (path) => path, keys)).toEqual(
      keys.map((key) => RELATED[key]),
    );
  });

  it("names every writing tone, lowercased as it reads in a sentence", () => {
    expect(product.coverLetters.tones).toEqual(
      Object.fromEntries(
        Object.entries(TONE_CHOICES).map(([tone, choice]) => [tone, choice.label.toLowerCase()]),
      ),
    );
  });

  it("names every interview prep level", () => {
    expect(Object.keys(product.interviewPrep.levels)).toEqual([...PREP_LEVELS]);
    for (const level of PREP_LEVELS) expect(product.interviewPrep.levels[level]).toBe(level);
  });
});
