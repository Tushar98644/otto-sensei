import Link from "next/link";
import { MERCHANT } from "@/app/[lang]/(marketing)/_components/merchant";
import { BRAND } from "@/config/brand";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { loadMessages } from "@/i18n/messages";
import { localizer, pageKey } from "@/i18n/pages";
import { publishedByLocale, publishedPages } from "@/i18n/publish";
import { LanguagePicker } from "./language-picker";
import { FOOTER_GROUPS, ROUTES } from "./routes";
import { SiteLogo } from "./site-logo";

const SHOW_SUPPORT_EMAIL = !BRAND.supportEmail.toLowerCase().endsWith("@example.com");

export async function SiteFooter({
  locale = DEFAULT_LOCALE,
  languages = true,
}: {
  locale?: Locale;
  // Off on a 404, whose address isn't a page in any language.
  languages?: boolean;
}) {
  const { footer } = await loadMessages(locale, "site");
  const published = await publishedPages(locale);
  const href = localizer(locale, published);
  // A translated footer lists only pages in its own language; English lists them all.
  const groups = FOOTER_GROUPS.map((group) => ({
    ...group,
    links: group.links.filter((link) => {
      const key = pageKey(link.href);
      return key !== null && published.has(key);
    }),
  })).filter((group) => group.links.length > 0);
  return (
    <footer className="border-t border-border bg-background">
      <div className="container-page flex flex-col gap-10 py-10 sm:py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col items-start gap-1">
            <SiteLogo href={href(ROUTES.home)} />
            <p className="text-sm text-muted">{footer.tagline}</p>
            {SHOW_SUPPORT_EMAIL ? (
              <a
                href={`mailto:${BRAND.supportEmail}`}
                className="inline-flex min-h-12 items-center text-sm text-ink underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-ink sm:min-h-11"
              >
                {BRAND.supportEmail}
              </a>
            ) : null}
          </div>
          <nav
            aria-label={footer.label}
            className="grid min-w-0 grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 sm:gap-x-12"
          >
            {groups.map((group) => (
              <div key={group.id} className="flex flex-col">
                <h2
                  id={`footer-${group.id}`}
                  className="font-sans text-xs/4 font-medium tracking-widest text-subtle uppercase"
                >
                  {footer.groups[group.id]}
                </h2>
                <ul aria-labelledby={`footer-${group.id}`} className="mt-2">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={href(link.href)}
                        prefetch={false}
                        className="inline-flex min-h-11 items-center text-sm whitespace-nowrap text-muted transition-colors hover:text-ink pointer-fine:min-h-8"
                      >
                        {footer.links[link.key]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p className="text-sm/5 text-subtle">
          © {new Date().getUTCFullYear()} {BRAND.name} ·{" "}
          {fmt(footer.payments, { merchant: MERCHANT.name })}
        </p>
        {languages ? (
          <LanguagePicker
            label={footer.language}
            current={locale}
            published={await publishedByLocale()}
            className="-mt-6"
          />
        ) : null}
      </div>
    </footer>
  );
}
