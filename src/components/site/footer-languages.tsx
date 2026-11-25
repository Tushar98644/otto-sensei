import { Globe } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";
import { LanguagePicker } from "./language-picker";
import type { LanguageLinks } from "./page-languages";

// The footer's language picker, for SiteFooter's languages slot: only pages that show it carry its code.
export async function footerLanguages(locale: Locale, links: LanguageLinks) {
  const { footer } = await loadMessages(locale, "site");
  return (
    <LanguagePicker
      label={footer.language}
      current={locale}
      links={links}
      icon={<Globe aria-hidden className="size-4 shrink-0 text-subtle" />}
      className="-mt-6"
    />
  );
}
