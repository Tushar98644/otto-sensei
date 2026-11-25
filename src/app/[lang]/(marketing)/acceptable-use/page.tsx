import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { fmt } from "@/i18n/format";
import { englishMessages } from "@/i18n/messages";
import type { Localize } from "@/i18n/pages";
import { getLocalize, localizedMetadata, requirePublished } from "@/i18n/publish";
import { rich } from "@/i18n/rich";
import { getFormat, getMessages } from "@/i18n/server";
import {
  Bullets,
  LegalPage,
  richList,
  type LegalMessages,
  type LegalSection,
} from "../_components/legal-page";

const PATH = ROUTES.acceptableUse;

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = (await getMessages("legal")).acceptableUse;
  return localizedMetadata({
    title: meta.title,
    description: fmt(meta.description, { brand: BRAND.name }),
    path: PATH,
  });
}

const MAILTO = `mailto:${BRAND.supportEmail}`;

function acceptableUseSections(t: LegalMessages, href: Localize): LegalSection[] {
  const en = englishMessages().legal.acceptableUse;
  const a = t.acceptableUse;
  return [
    { title: a.purpose.title, anchor: en.purpose.title, body: <p>{a.purpose.body}</p> },
    {
      title: a.forbidden.title,
      anchor: en.forbidden.title,
      body: <Bullets items={richList(en.forbidden.items, a.forbidden.items)} />,
    },
    { title: a.enforcement.title, anchor: en.enforcement.title, body: <p>{a.enforcement.body}</p> },
    {
      title: a.models.title,
      anchor: en.models.title,
      body: (
        <p>
          {rich(
            a.models.body,
            { link: (chunk) => <Link href={href(ROUTES.privacy)}>{chunk}</Link> },
            { brand: BRAND.name },
          )}
        </p>
      ),
    },
    {
      title: a.report.title,
      anchor: en.report.title,
      body: (
        <p>
          {rich(
            a.report.body,
            { link: (chunk) => <a href={MAILTO}>{chunk}</a> },
            { email: BRAND.supportEmail },
          )}
        </p>
      ),
    },
  ];
}

export default async function AcceptableUsePage() {
  await requirePublished(PATH);
  const t = await getMessages("legal");
  const format = await getFormat();
  const href = await getLocalize();
  return (
    <LegalPage
      t={t.page}
      format={format}
      path={PATH}
      title={t.acceptableUse.title}
      intro={
        <p>
          {rich(
            t.acceptableUse.intro,
            { link: (chunk) => <Link href={href(ROUTES.terms)}>{chunk}</Link> },
            { brand: BRAND.name },
          )}
        </p>
      }
      sections={acceptableUseSections(t, href)}
    />
  );
}
