import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import {
  AI_TOKEN_BUDGETS,
  applicationLimit,
  FEATURES,
  FREE_JOB_MATCHES,
  PLAN_ORDER,
  PLANS,
  PRICES_USD,
  PRO_TRIAL,
  resumeLimit,
} from "@/config/plans";
import { TOPUP_LIMITS } from "@/config/topup";
import { creditOffered } from "@/lib/billing/intervals";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { englishMessages } from "@/i18n/messages";
import type { Localize } from "@/i18n/pages";
import { getLocalize, localizedMetadata, requirePublished } from "@/i18n/publish";
import { rich } from "@/i18n/rich";
import { getFormat, getMessages } from "@/i18n/server";
import { TRANSCRIBE_LIMITS } from "@/app/api/transcribe/limits";
import {
  Bullets,
  LegalPage,
  richList,
  type LegalMessages,
  type LegalSection,
} from "../_components/legal-page";
import { MERCHANT } from "../_components/merchant";
import { usd } from "../_components/price-copy";

const PATH = ROUTES.terms;

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = (await getMessages("legal")).terms;
  return localizedMetadata({
    title: meta.title,
    description: fmt(meta.description, { brand: BRAND.name }),
    path: PATH,
  });
}

const MAILTO = `mailto:${BRAND.supportEmail}`;

type TermsMessages = LegalMessages["terms"];

const LONG_COMPACT: Intl.NumberFormatOptions = {
  notation: "compact",
  compactDisplay: "long",
  maximumFractionDigits: 1,
};

function tokensInWords(t: TermsMessages, format: Format, tokens: number): string {
  return tokens === 500_000 ? t.plans.atLimit.halfMillion : format.number(tokens, LONG_COMPACT);
}

function Limit({ value, t, format }: { value: number; t: TermsMessages; format: Format }) {
  if (value > 0) return format.number(value);
  return (
    <>
      <span aria-hidden>–</span>
      <span className="sr-only">{t.plans.table.none}</span>
    </>
  );
}

function LimitsTable({ t, format }: { t: TermsMessages; format: Format }) {
  const table = t.plans.table;
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">{table.eachMonth}</th>
          {PLAN_ORDER.map((plan) => (
            <th key={plan} scope="col">
              {PLANS[plan].name}
            </th>
          ))}
          <th scope="col" className="sm:whitespace-nowrap">
            {table.trial}
          </th>
        </tr>
      </thead>
      <tbody>
        {FEATURES.map((feature) => (
          <tr key={feature}>
            <th scope="row">{table.features[feature]}</th>
            {PLAN_ORDER.map((plan) => (
              <td key={plan}>
                <Limit value={PLANS[plan].limits[feature]} t={t} format={format} />
              </td>
            ))}
            <td>
              <Limit value={PRO_TRIAL.limits[feature]} t={t} format={format} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type TermsProps = { t: LegalMessages; format: Format; href: Localize };

function termsSections({ t, format, href }: TermsProps): LegalSection[] {
  const en = englishMessages().legal.terms;
  const terms = t.terms;
  const { plans, payments } = terms;
  const count = (value: number) => format.number(value);
  const trialPrice = usd(format, PRO_TRIAL.priceUsd);
  const values = {
    brand: BRAND.name,
    email: BRAND.supportEmail,
    merchant: MERCHANT.name,
    pro: PLANS.pro.name,
    max: PLANS.max.name,
  };
  const mail = { link: (chunk: string) => <a href={MAILTO}>{chunk}</a> };
  const pageLink = (path: string) => ({
    link: (chunk: string) => <Link href={href(path)}>{chunk}</Link>,
  });
  const buyerTerms = (chunk: string) => <a href={MERCHANT.buyerTermsUrl}>{chunk}</a>;
  const includes = {
    ...values,
    fixes: count(PLANS.free.limits.fix),
    resumes: format.plural(plans.resumes, resumeLimit("free")),
    matches: count(FREE_JOB_MATCHES),
    applications: format.plural(plans.trackedApplications, applicationLimit("free")),
    proResumes: count(resumeLimit("pro")),
    proApplications: count(applicationLimit("pro")),
    maxResumes: count(resumeLimit("max")),
    maxApplications: count(applicationLimit("max")),
  };
  return [
    {
      title: terms.who.title,
      anchor: en.who.title,
      body: <p>{rich(terms.who.body, mail, values)}</p>,
    },
    {
      title: terms.service.title,
      anchor: en.service.title,
      body: (
        <>
          <p>{fmt(terms.service.asIs, values)}</p>
          <p>{terms.service.guidance}</p>
        </>
      ),
    },
    {
      title: terms.account.title,
      anchor: en.account.title,
      body: <p>{fmt(terms.account.body, values)}</p>,
    },
    {
      title: terms.content.title,
      anchor: en.content.title,
      body: (
        <>
          <p>{rich(terms.content.yours, pageLink(ROUTES.privacy))}</p>
          <p>{terms.content.rights}</p>
        </>
      ),
    },
    {
      title: terms.misuse.title,
      anchor: en.misuse.title,
      body: (
        <>
          <Bullets items={richList(en.misuse.items, terms.misuse.items)} />
          <p>{terms.misuse.outro}</p>
        </>
      ),
    },
    {
      title: terms.ai.title,
      anchor: en.ai.title,
      body: (
        <>
          <p>{terms.ai.intro}</p>
          <Bullets items={richList(en.ai.items, terms.ai.items)} />
          <p>{rich(terms.ai.outro, pageLink(ROUTES.acceptableUse))}</p>
        </>
      ),
    },
    {
      title: plans.title,
      anchor: en.plans.title,
      body: (
        <>
          <h3>{plans.includes.title}</h3>
          <ul>
            <li>{rich(plans.includes.free, {}, includes)}</li>
            <li>{rich(plans.includes.paid, {}, includes)}</li>
            <li>{rich(plans.includes.ends)}</li>
          </ul>
          <h3>{plans.resets.title}</h3>
          <p>{plans.resets.intro}</p>
          <Bullets items={richList(en.plans.resets.items, plans.resets.items)} />
          <p>{plans.resets.next}</p>
          <LimitsTable t={terms} format={format} />
          <h3>{plans.atLimit.title}</h3>
          <p>{plans.atLimit.pauses}</p>
          <p>
            {fmt(plans.atLimit.budget, {
              ...values,
              proTokens: tokensInWords(terms, format, AI_TOKEN_BUDGETS.pro),
              maxTokens: tokensInWords(terms, format, AI_TOKEN_BUDGETS.max),
              trialTokens: tokensInWords(terms, format, AI_TOKEN_BUDGETS.trial),
            })}
          </p>
          <h3>{plans.voice.title}</h3>
          <p>
            {fmt(plans.voice.body, {
              ...values,
              freeClips: count(TRANSCRIBE_LIMITS.daily.calls.free),
              proClips: count(TRANSCRIBE_LIMITS.daily.calls.pro),
              maxClips: count(TRANSCRIBE_LIMITS.daily.calls.max),
            })}
          </p>
        </>
      ),
    },
    {
      title: payments.title,
      anchor: en.payments.title,
      body: (
        <ul>
          <li>
            {fmt(payments.prices, {
              proMonth: usd(format, PRICES_USD.pro.month),
              proYear: usd(format, PRICES_USD.pro.year),
              maxMonth: usd(format, PRICES_USD.max.month),
              maxYear: usd(format, PRICES_USD.max.year),
            })}
          </li>
          <li>
            {fmt(payments.trial, {
              days: PRO_TRIAL.days,
              price: trialPrice,
              proMonth: usd(format, PRICES_USD.pro.month),
            })}
          </li>
          <li>
            {rich(
              payments.merchant,
              { link: buyerTerms },
              { disclosure: fmt(t.disclosure, { merchant: MERCHANT.name }) },
            )}
          </li>
          <li>{rich(payments.renewal, pageLink(ROUTES.account), { price: trialPrice })}</li>
          {creditOffered() ? (
            <li>
              {fmt(payments.credit, {
                ...values,
                min: usd(format, TOPUP_LIMITS.minUsd),
                maxUsd: usd(format, TOPUP_LIMITS.maxUsd),
              })}
            </li>
          ) : null}
          <li>{payments.failed}</li>
          <li>{payments.changes}</li>
          <li>
            {rich(
              payments.refunds,
              {
                link: (chunk, index) =>
                  index === 0 ? (
                    buyerTerms(chunk)
                  ) : (
                    <Link href={href(ROUTES.refunds)}>{chunk}</Link>
                  ),
              },
              values,
            )}
          </li>
        </ul>
      ),
    },
    {
      title: terms.ending.title,
      anchor: en.ending.title,
      body: <p>{fmt(terms.ending.body, values)}</p>,
    },
    {
      title: terms.liability.title,
      anchor: en.liability.title,
      body: <p>{fmt(terms.liability.body, values)}</p>,
    },
    {
      title: terms.changes.title,
      anchor: en.changes.title,
      body: <p>{fmt(terms.changes.body, values)}</p>,
    },
    {
      title: terms.contact.title,
      anchor: en.contact.title,
      body: <p>{rich(terms.contact.body, mail, values)}</p>,
    },
  ];
}

export default async function TermsPage() {
  await requirePublished(PATH);
  const t = await getMessages("legal");
  const format = await getFormat();
  const href = await getLocalize();
  const summary = richList(englishMessages().legal.terms.summary, t.terms.summary, {
    month: usd(format, PRICES_USD.pro.month),
    year: usd(format, PRICES_USD.pro.year),
    days: PRO_TRIAL.days,
    trialPrice: usd(format, PRO_TRIAL.priceUsd),
  });
  return (
    <LegalPage
      t={t.page}
      format={format}
      path={PATH}
      title={t.terms.title}
      intro={<p>{fmt(t.terms.intro, { brand: BRAND.name })}</p>}
      summary={summary.map(([, item]) => item)}
      sections={termsSections({ t, format, href })}
    />
  );
}
