import type { ReactNode } from "react";
import { footerLanguages } from "@/components/site/footer-languages";
import type { HintCopy } from "@/components/site/language-hint";
import { LanguageHintLoader } from "@/components/site/language-hint-loader";
import { languageLinks } from "@/components/site/language-links";
import { SiteFonts } from "@/components/site/site-fonts";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { DEFAULT_LOCALE, ENABLED_LOCALES, type Locale } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";
import { getLocale } from "@/i18n/server";
import { SmoothScroll } from "./_components/smooth-scroll";

// Each other language's offer to read the page in it, in that language.
async function languageHints(): Promise<Partial<Record<Locale, HintCopy>>> {
  const others = ENABLED_LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
  const hints = await Promise.all(
    others.map(async (locale) => [locale, (await loadMessages(locale, "site")).languageHint]),
  );
  return Object.fromEntries(hints);
}

// Renders the page's <main> (the skip link targets #main): pages here must not add their own.
export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const links = await languageLinks();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteFonts />
      <SmoothScroll />
      <SiteHeader locale={locale} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter locale={locale} languages={await footerLanguages(locale, links)} />
      {locale === DEFAULT_LOCALE ? (
        <LanguageHintLoader hints={await languageHints()} links={links} />
      ) : null}
    </div>
  );
}
