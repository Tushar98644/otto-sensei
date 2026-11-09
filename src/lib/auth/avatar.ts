import { log } from "@/lib/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { devAuthActive } from "./dev-mode";

// Server-only. The picture of the signed-in account, when it signed in with Google: the portfolio
// uses it as the photo until the owner picks another. Email-code accounts have none.

// Google serves profile pictures from these hosts only; anything else in the metadata is ignored.
const GOOGLE_PICTURE_HOST = /(^|\.)googleusercontent\.com$/;

/** The https Google picture in Supabase user metadata, sized up from Google's 96px default. */
export function googleAvatarOf(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const raw = metadata?.avatar_url ?? metadata?.picture;
  if (typeof raw !== "string" || raw.length > 2_048) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !GOOGLE_PICTURE_HOST.test(url.hostname)) return null;
    // "...=s96-c" asks Google for 96px; the page wants a sharper one.
    return url.href.replace(/=s\d+-c$/, "=s512-c");
  } catch {
    return null;
  }
}

export async function accountAvatarUrl(): Promise<string | null> {
  if (devAuthActive()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return googleAvatarOf(data.user.user_metadata);
  } catch (error) {
    // A missing picture is never worth failing the page over.
    log.warn("auth.avatar_failed", {}, error);
    return null;
  }
}
