import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { emailMessages } from "@/lib/notifications/locale";

// The sign-in code email Supabase sends (Confirm signup and Magic Link), written to the project by scripts/email-templates.ts.

// The user_metadata key the template reads; its own name, since Google sign-in can write a "locale" of its own.
export const AUTH_LOCALE_KEY = "otto_locale";

const SITE = "https://www.ottosensei.com";
const TOKEN = "{{ .Token }}";

// Only what HTML text needs: English keeps its apostrophes exactly as the template always had them.
const text = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function codeEmailSubject(locale: Locale): string {
  return fmt(emailMessages(locale).signInCode.subject, { token: TOKEN });
}

export function codeEmailBody(locale: Locale): string {
  const t = emailMessages(locale).signInCode;
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#12241d;max-width:480px">
<img src="${SITE}/email/otto-head.png" width="48" height="48" alt="Otto" style="display:block;margin:0 0 16px;border:0">
<p style="margin:0 0 8px">${text(t.lead)}</p>
<p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:6px">${TOKEN}</p>
<p style="margin:0 0 16px">${text(t.expires)}</p>
<p style="margin:0;color:#475850;font-size:14px">${text(t.ignore)}</p>
</div>`;
}

// One Go template with a block per language; printf turns a missing key into "<nil>", so eq never sees a nil.
export function byLocale(render: (locale: Locale) => string): string {
  const others = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
  const blocks = others.map(
    (locale, index) =>
      `{{ ${index === 0 ? "if" : "else if"} eq (printf "%v" .Data.${AUTH_LOCALE_KEY}) "${locale}" }}${render(locale)}`,
  );
  return `${blocks.join("")}{{ else }}${render(DEFAULT_LOCALE)}{{ end }}`;
}

export const CODE_EMAIL = {
  subject: byLocale(codeEmailSubject),
  body: byLocale(codeEmailBody),
} as const;
