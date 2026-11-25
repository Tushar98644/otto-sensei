import { isAuthApiError } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/config";
import { log } from "@/lib/log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AUTH_LOCALE_KEY } from "./code-email";
import { deleteDevIdentity } from "./dev";
import { devAuthActive } from "./dev-mode";

export function canDeleteAuthUsers(): boolean {
  return devAuthActive() || createSupabaseAdminClient() !== null;
}

export async function deleteAuthUser(userId: string): Promise<void> {
  if (devAuthActive()) return deleteDevIdentity(userId);
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase secret key is not configured");
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error && !(isAuthApiError(error) && error.status === 404)) {
    throw new Error("Supabase couldn't delete the auth user", { cause: error });
  }
}

// The sign-in code email reads its language from user_metadata; Supabase merges this key into what is there. False when it couldn't.
export async function setAuthLocale(userId: string, locale: Locale): Promise<boolean> {
  if (devAuthActive()) return false;
  const admin = createSupabaseAdminClient();
  if (!admin) return false;
  try {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { [AUTH_LOCALE_KEY]: locale },
    });
    if (!error) return true;
    log.warn("auth.locale_not_saved", { status: error.status ?? 0 });
  } catch (error) {
    log.warn("auth.locale_not_saved", {}, error);
  }
  return false;
}
