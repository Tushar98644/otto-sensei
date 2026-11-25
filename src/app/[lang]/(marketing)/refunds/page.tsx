import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { IntentLink } from "@/components/site/intent-link";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { buttonClasses } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { PRO_TRIAL } from "@/config/plans";
import { fmt } from "@/i18n/format";
import { englishMessages } from "@/i18n/messages";
import type { Localize } from "@/i18n/pages";
import { getLocalize, localizedMetadata, requirePublished } from "@/i18n/publish";
import { rich } from "@/i18n/rich";
import { getFormat, getMessages } from "@/i18n/server";
import {
  LegalPage,
  richList,
  type LegalMessages,
  type LegalSection,
} from "../_components/legal-page";
import { MERCHANT } from "../_components/merchant";
import { usd } from "../_components/price-copy";

const PATH = ROUTES.refunds;

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = (await getMessages("legal")).refunds;
  return localizedMetadata({
    title: meta.title,
    description: fmt(meta.description, { merchant: MERCHANT.name }),
    path: PATH,
  });
}

const BILLING_HREF = `${ROUTES.account}#plan`;

const MAILTO = `mailto:${BRAND.supportEmail}`;

function refundSections(t: LegalMessages, href: Localize, trialPrice: string): LegalSection[] {
  const en = englishMessages().legal.refunds;
  const r = t.refunds;
  const values = { merchant: MERCHANT.name, email: BRAND.supportEmail };
  const trial = { days: PRO_TRIAL.days, price: trialPrice };
  const buyerHelp = (chunk: string) => <a href={MERCHANT.buyerHelpUrl}>{chunk}</a>;
  return [
    {
      title: r.pay.title,
      anchor: en.pay.title,
      body: (
        <>
          <p>{fmt(t.disclosure, values)}</p>
          <p>{fmt(r.pay.receipt, values)}</p>
        </>
      ),
    },
    {
      title: r.refunds.title,
      anchor: en.refunds.title,
      body: (
        <p>
          {rich(
            r.refunds.body,
            {
              link: (chunk, index) =>
                index === 0 ? <a href={MERCHANT.buyerTermsUrl}>{chunk}</a> : buyerHelp(chunk),
            },
            values,
          )}
        </p>
      ),
    },
    {
      title: r.cancel.title,
      anchor: en.cancel.title,
      body: (
        <>
          <p>
            {rich(r.cancel.anytime, {
              link: (chunk) => <Link href={href(ROUTES.account)}>{chunk}</Link>,
            })}
          </p>
          <p>{fmt(r.cancel.trial, trial)}</p>
        </>
      ),
    },
    {
      title: r.deleting.title,
      anchor: en.deleting.title,
      body: <p>{r.deleting.body}</p>,
    },
    {
      title: r.questions.title,
      anchor: en.questions.title,
      body: (
        <>
          <p>
            {rich(
              r.questions.email,
              {
                link: (chunk, index) =>
                  index === 0 ? <a href={MAILTO}>{chunk}</a> : buyerHelp(chunk),
              },
              values,
            )}
          </p>
          <p>{r.questions.rights}</p>
        </>
      ),
    },
  ];
}

export default async function RefundsPage() {
  await requirePublished(PATH);
  const t = await getMessages("legal");
  const format = await getFormat();
  const href = await getLocalize();
  const trialPrice = usd(format, PRO_TRIAL.priceUsd);
  const summary = richList(
    englishMessages().legal.refunds.summary,
    t.refunds.summary,
    { merchant: MERCHANT.name, days: PRO_TRIAL.days, price: trialPrice },
    {
      ask: {
        link: (chunk, index) => (
          <TextLink href={index === 0 ? MERCHANT.buyerHelpUrl : MAILTO}>{chunk}</TextLink>
        ),
      },
    },
  );
  return (
    <LegalPage
      t={t.page}
      format={format}
      path={PATH}
      title={t.refunds.title}
      intro={
        <p>
          {rich(t.refunds.intro, {}, { merchant: MERCHANT.name, prefix: MERCHANT.statementPrefix })}
        </p>
      }
      summary={summary.map(([, item]) => item)}
      action={
        <IntentLink href={href(BILLING_HREF)} className={buttonClasses()}>
          {t.refunds.manageBilling}
          <ArrowRight />
        </IntentLink>
      }
      sections={refundSections(t, href, trialPrice)}
    />
  );
}
