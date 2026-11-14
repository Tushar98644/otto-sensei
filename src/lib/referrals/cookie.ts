import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import { isProduction } from "@/lib/env";
import { getDeviceId } from "@/lib/http";
import { log } from "@/lib/log";
import { claimReferral } from "./records";
import {
  REF_COOKIE,
  REF_COOKIE_MAX_AGE_S,
  formatRefCookie,
  parseRefCookie,
  type RefCookie,
  type ReferralClaimOutcome,
} from "./referrals";

export async function readRefCookie(): Promise<RefCookie | null> {
  return parseRefCookie((await cookies()).get(REF_COOKIE)?.value);
}

async function writeRefCookie(next: RefCookie | null): Promise<void> {
  const jar = await cookies();
  const options = { path: "/", sameSite: "lax" as const, secure: isProduction(), httpOnly: false };
  if (!next) {
    jar.delete({ name: REF_COOKIE, ...options });
    return;
  }
  jar.set(REF_COOKIE, formatRefCookie(next), { ...options, maxAge: REF_COOKIE_MAX_AGE_S });
}

export async function claimFromCookie(
  user: SessionUser,
  { checked }: { checked: boolean },
  now = Date.now(),
): Promise<ReferralClaimOutcome> {
  const cookie = await readRefCookie();
  if (!cookie) return "none";
  const outcome = await claimReferral(
    {
      userId: user.id,
      code: cookie.code,
      deviceId: await getDeviceId(),
      checked: checked || cookie.stage === "checked",
    },
    now,
  );
  await writeRefCookie(outcome === "pending" ? { code: cookie.code, stage: "joined" } : null);
  return outcome;
}

// Returns the user when it had to look one up (null if signed out), so the caller needn't ask again.
export async function noteReferralCheck(now = Date.now()): Promise<SessionUser | null | undefined> {
  let user: SessionUser | null | undefined;
  try {
    const cookie = await readRefCookie();
    if (!cookie) return undefined;
    user = await getCurrentUser();
    if (user) {
      await claimFromCookie(user, { checked: true }, now);
      return user;
    }
    if (cookie.stage !== "checked") await writeRefCookie({ code: cookie.code, stage: "checked" });
  } catch (error) {
    log.warn("referral.check_note_failed", {}, error);
  }
  return user;
}
