import { cookies } from "next/headers";
import { isEnabledLocale } from "@/i18n/config";
import { LOCALE_COOKIE, localeCookieOptions } from "@/i18n/routing";
import { limitHourlyWrites } from "@/lib/api/limits";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { LanguageChangeSchema, saveLanguage } from "@/lib/account/language";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to change the app's language.";
const CHANGES_PER_HOUR = 30;

// Saves the app's language and sets the cookie src/proxy.ts reads; not offered in the app until it is translated.
export async function PUT(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const limited = await limitHourlyWrites(
      `language:write:user:${user.id}`,
      CHANGES_PER_HOUR,
      "language changes",
    );
    if (limited) return limited;
    const body = await readJson(req, LanguageChangeSchema);
    if (!body.ok || !isEnabledLocale(body.data.locale)) {
      log.info("language.bad_request", { reason: body.ok ? "not_enabled" : body.message });
      return fail("bad_request", "That language isn't available yet.", 400, NO_STORE);
    }
    const { locale } = body.data;
    if (!(await saveLanguage(user.id, locale))) {
      log.info("language.after_account_deleted");
      return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    }
    (await cookies()).set(LOCALE_COOKIE, locale, localeCookieOptions());
    log.info("language.chosen", { locale });
    return ok({ locale }, { headers: NO_STORE });
  } catch (error) {
    log.error("language.save_failed", error);
    return fail("server_error", "Couldn't change the language. Please try again.", 500, NO_STORE);
  }
}
