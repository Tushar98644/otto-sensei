import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY_LAST_UPDATED, ROUTES } from "@/components/site/routes";
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
  Paragraphs,
  richList,
  type LegalMessages,
  type LegalSection,
} from "../_components/legal-page";
import { MERCHANT } from "../_components/merchant";

const PATH = ROUTES.privacy;

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = (await getMessages("legal")).privacy;
  return localizedMetadata({
    title: meta.title,
    description: fmt(meta.description, { brand: BRAND.name }),
    path: PATH,
  });
}

const MAILTO = `mailto:${BRAND.supportEmail}`;

function privacySections(t: LegalMessages, href: Localize): LegalSection[] {
  const en = englishMessages().legal.privacy;
  const p = t.privacy;
  const values = {
    brand: BRAND.name,
    merchant: MERCHANT.name,
    email: BRAND.supportEmail,
    disclosure: fmt(t.disclosure, { merchant: MERCHANT.name }),
  };
  const merchantPrivacy = (chunk: string) => <a href={MERCHANT.privacyUrl}>{chunk}</a>;
  const mail = (chunk: string) => <a href={MAILTO}>{chunk}</a>;
  return [
    {
      title: p.collect.title,
      anchor: en.collect.title,
      body: <Bullets items={richList(en.collect.items, p.collect.items, values)} />,
    },
    {
      title: p.ai.title,
      anchor: en.ai.title,
      body: (
        <>
          <p>{p.ai.intro}</p>
          <Bullets items={richList(en.ai.items, p.ai.items)} />
          <Paragraphs items={richList(en.ai.notes, p.ai.notes)} />
        </>
      ),
    },
    {
      title: p.chrome.title,
      anchor: en.chrome.title,
      body: (
        <>
          <p>{p.chrome.intro}</p>
          <Bullets items={richList(en.chrome.items, p.chrome.items, values)} />
          <p>{p.chrome.outro}</p>
        </>
      ),
    },
    {
      title: p.payments.title,
      anchor: en.payments.title,
      body: (
        <>
          <p>{rich(p.payments.checkout, { link: merchantPrivacy }, values)}</p>
          <Bullets items={richList(en.payments.items, p.payments.items, values)} />
        </>
      ),
    },
    {
      title: p.cookies.title,
      anchor: en.cookies.title,
      body: (
        <>
          <p>{p.cookies.intro}</p>
          <Bullets
            items={richList(en.cookies.items, p.cookies.items, values, {
              checkout: { link: merchantPrivacy },
            })}
          />
          <p>{p.cookies.outro}</p>
        </>
      ),
    },
    {
      title: p.sharing.title,
      anchor: en.sharing.title,
      body: (
        <>
          <p>{fmt(p.sharing.intro, values)}</p>
          <Bullets items={richList(en.sharing.items, p.sharing.items, values)} />
          <p>{p.sharing.outro}</p>
        </>
      ),
    },
    {
      title: p.retention.title,
      anchor: en.retention.title,
      body: <Bullets items={richList(en.retention.items, p.retention.items)} />,
    },
    {
      title: p.choices.title,
      anchor: en.choices.title,
      body: (
        <Bullets
          items={richList(en.choices.items, p.choices.items, values, {
            account: { link: (chunk) => <Link href={href(ROUTES.account)}>{chunk}</Link> },
            data: { link: mail },
          })}
        />
      ),
    },
    {
      title: p.children.title,
      anchor: en.children.title,
      body: <p>{fmt(p.children.body, values)}</p>,
    },
    {
      title: p.changes.title,
      anchor: en.changes.title,
      body: <p>{p.changes.body}</p>,
    },
    {
      title: p.contact.title,
      anchor: en.contact.title,
      body: <p>{rich(p.contact.body, { link: mail }, values)}</p>,
    },
  ];
}

export default async function PrivacyPage() {
  await requirePublished(PATH);
  const t = await getMessages("legal");
  const format = await getFormat();
  const href = await getLocalize();
  const values = { brand: BRAND.name, merchant: MERCHANT.name };
  return (
    <LegalPage
      t={t.page}
      format={format}
      path={PATH}
      updated={PRIVACY_LAST_UPDATED}
      title={t.privacy.title}
      intro={<p>{fmt(t.privacy.intro, values)}</p>}
      summary={richList(englishMessages().legal.privacy.summary, t.privacy.summary, values).map(
        ([, item]) => item,
      )}
      sections={privacySections(t, href)}
    />
  );
}
