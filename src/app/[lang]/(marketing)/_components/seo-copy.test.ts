import { describe, expect, it } from "vitest";
import { OTTO } from "@/components/mascot/lines";
import { formatFor } from "@/i18n/intl";
import { englishMessages } from "@/i18n/messages";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { ATS_GUIDES } from "@/lib/seo-pages/ats";
import { COMPETITORS, compareTitle } from "@/lib/seo-pages/compare";
import { ROLE_EXAMPLES } from "@/lib/seo-pages/examples";
import {
  ATS_INDEX_PAGE,
  COMPARE_INDEX_PAGE,
  RELATED,
  RESUME_EXAMPLES_PAGE,
  RESUME_TEMPLATES_PAGE,
  atsGuidePage,
  comparePage,
  exampleHeadline,
  examplePage,
} from "@/lib/seo-pages/pages";
import {
  atsGuideMeta,
  atsIndexMeta,
  compareIndexMeta,
  compareMeta,
  compareTitleIn,
  exampleHeadlineIn,
  exampleMeta,
  examplesIndexMeta,
  templatesMeta,
} from "./seo-copy";

const en = englishMessages();
const format = formatFor("en");
const pick = ({ path, title, description, absoluteTitle, noindex }: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries({ path, title, description, absoluteTitle, noindex }).filter(
      ([, value]) => value !== undefined && value !== false,
    ),
  );

describe("the guide pages' English words", () => {
  it("title and describe every guide page as src/lib/seo-pages/pages.ts does", () => {
    expect(pick(compareIndexMeta(en.compare, format))).toEqual(pick(COMPARE_INDEX_PAGE));
    expect(pick(atsIndexMeta(en.ats, format))).toEqual(pick(ATS_INDEX_PAGE));
    expect(pick(examplesIndexMeta(en.resumeExamples, format))).toEqual(pick(RESUME_EXAMPLES_PAGE));
    expect(pick(templatesMeta(en.resumeTemplates, format))).toEqual(pick(RESUME_TEMPLATES_PAGE));
    for (const competitor of COMPETITORS) {
      expect(compareTitleIn(en.compare, competitor)).toBe(compareTitle(competitor));
      expect(pick(compareMeta(en.compare, competitor))).toEqual(pick(comparePage(competitor)));
    }
    for (const guide of ATS_GUIDES) {
      expect(pick(atsGuideMeta(guide, { locale: "en", t: en.ats }))).toEqual(
        pick(atsGuidePage(guide)),
      );
    }
    for (const example of ROLE_EXAMPLES) {
      expect(exampleHeadlineIn(en.resumeExamples, example)).toBe(exampleHeadline(example));
      expect(pick(exampleMeta(en.resumeExamples, example))).toEqual(pick(examplePage(example)));
    }
  });

  it("describe each format and the related pages as their sources do", () => {
    for (const [id, info] of Object.entries(TEMPLATE_INFO)) {
      expect(en.resumeTemplates.formats[id as keyof typeof TEMPLATE_INFO]).toEqual({
        description: info.description,
        bestFor: info.bestFor,
      });
    }
    expect(en.resumeTemplates.tip).toBe(OTTO.formats.tip);
    expect(en.seo.related.builder.title).toBe(RELATED.builder.title);
    expect(en.seo.related.pricing.title).toBe(RELATED.pricing.title);
  });
});
