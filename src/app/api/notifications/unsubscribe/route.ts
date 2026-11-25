import { accountSectionHref } from "@/components/setup/links";
import { getDb } from "@/db/client";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { savedLocale } from "@/lib/account/language";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { appUrl } from "@/lib/env";
import { log } from "@/lib/log";
import { stopEmails } from "@/lib/notifications/choices";
import { OTTO_HEAD_EMAIL_PATH } from "@/lib/notifications/follow-up";
import { localizedPath } from "@/lib/notifications/locale";
import type { EmailList } from "@/lib/notifications/types";
import {
  isEmailList,
  UNSUBSCRIBE_PATH,
  verifyUnsubscribeToken,
} from "@/lib/notifications/unsubscribe";
import { unsubscribeCopy, unsubscribePage } from "@/lib/notifications/unsubscribe-page";
import { isUserId } from "@/lib/users";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Link = { userId: string; token: string; list: EmailList };

// A link without a list is a follow-up reminder link from before there were others.
function readLink(url: URL): Link | null {
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  const list = url.searchParams.get("l") ?? "reminders";
  if (!isEmailList(list) || !isUserId(userId) || !verifyUnsubscribeToken(userId, token, list)) {
    return null;
  }
  return { userId, token, list };
}

// Only a signed link names the account, so a bad one is answered in English.
async function localeOf(link: Link): Promise<Locale> {
  try {
    return await savedLocale(await getDb(), link.userId);
  } catch (error) {
    log.warn("notifications.unsubscribe_locale_failed", {}, error);
    return DEFAULT_LOCALE;
  }
}

function page(
  status: number,
  locale: Locale,
  title: string,
  message: string,
  action: string | null,
  press = "",
) {
  const base = appUrl();
  const html = unsubscribePage({
    title,
    message,
    action,
    press,
    settingsUrl: new URL(localizedPath(locale, accountSectionHref("reminders")), base).toString(),
    ottoHeadUrl: new URL(OTTO_HEAD_EMAIL_PATH, base).toString(),
    locale,
  });
  return new Response(html, {
    status,
    headers: {
      ...NO_STORE,
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function invalidPage(): Response {
  const copy = unsubscribeCopy(DEFAULT_LOCALE);
  return page(400, DEFAULT_LOCALE, copy.title, copy.invalid, null);
}

// RFC 8058 one-click comes from mail servers with no cookies: the signed link is the only proof.
export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const fromPage = url.searchParams.get("page") === "1";
  const link = readLink(url);
  if (!link) {
    log.info("notifications.unsubscribe_invalid");
    return fromPage
      ? invalidPage()
      : fail("bad_request", "That unsubscribe link isn't valid.", 400, NO_STORE);
  }
  const locale = fromPage ? await localeOf(link) : DEFAULT_LOCALE;
  const copy = unsubscribeCopy(locale);
  const list = copy.lists[link.list];
  try {
    await stopEmails(link.userId, link.list);
    log.info("notifications.unsubscribed", { list: link.list, fromPage });
    return fromPage ? page(200, locale, list.name, list.done, null) : ok({}, { headers: NO_STORE });
  } catch (error) {
    log.error("notifications.unsubscribe_failed", error, { list: link.list });
    return fromPage
      ? page(500, locale, list.name, copy.failed, null)
      : fail("server_error", unsubscribeCopy(DEFAULT_LOCALE).failed, 500, NO_STORE);
  }
});

// Link checkers open every link in an email, so GET changes nothing.
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (!url.searchParams.has("l")) {
    return Response.redirect(new URL(accountSectionHref("reminders"), appUrl()), 303);
  }
  const link = readLink(url);
  if (!link) return invalidPage();
  const locale = await localeOf(link);
  const list = unsubscribeCopy(locale).lists[link.list];
  const action = new URLSearchParams({ u: link.userId, t: link.token, l: link.list, page: "1" });
  return page(
    200,
    locale,
    list.name,
    list.ask,
    `${UNSUBSCRIBE_PATH}?${action.toString()}`,
    list.press,
  );
}
