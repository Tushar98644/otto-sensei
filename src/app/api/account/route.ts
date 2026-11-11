import { fail, ok } from "@/lib/api/respond";
import type { EmptyOk } from "@/lib/api/types";
import { canDeleteAuthUsers, deleteAuthUser } from "@/lib/auth/admin";
import { clearSession, getCurrentUser } from "@/lib/auth/session";
import {
  BillingError,
  cancelSubscriptionForDeletion,
  type DeletionCancelResult,
} from "@/lib/billing";
import { log } from "@/lib/log";
import { refreshPortfolioPages } from "@/lib/portfolio/cache";
import { portfolioSlugsOf } from "@/lib/portfolio/records";
import { deleteUserData } from "@/lib/users";

export const runtime = "nodejs";

const CANCEL_FAILED_MESSAGE =
  "We couldn't cancel your subscription, so your account wasn't deleted. Try again, or email us.";
const AUTH_DELETE_FAILED_MESSAGE =
  "Your resumes and data are deleted, but we couldn't finish closing your sign-in. Try again in a minute.";

// The subscription is cancelled first: once our rows are gone nobody could manage it and billing
// would go on. The Supabase user goes last, which also ends its sessions everywhere.
export async function DELETE(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to delete your account.", 401);
    // Checked before anything is deleted, so a missing key never leaves an account half gone.
    if (!canDeleteAuthUsers()) {
      log.error("account.delete_unavailable", "Supabase secret key is not configured");
      return fail(
        "auth_unavailable",
        "Account deletion isn't available right now. Email us and we'll do it.",
        503,
      );
    }

    let billing: DeletionCancelResult;
    try {
      billing = await cancelSubscriptionForDeletion(user);
    } catch (error) {
      if (!(error instanceof BillingError)) throw error;
      log.error("account.delete_blocked", error, { userId: user.id, reason: "cancel_failed" });
      return fail("billing_unavailable", CANCEL_FAILED_MESSAGE, 502);
    }

    // The public page is cached; it must stop showing once the rows are gone.
    const portfolioAddresses = await portfolioSlugsOf(user.id);
    await deleteUserData(user.id);
    refreshPortfolioPages(portfolioAddresses);
    try {
      await deleteAuthUser(user.id);
    } catch (error) {
      // The session still works, so a retry signs in, finds a fresh empty row and finishes.
      log.error("account.auth_delete_failed", error, { userId: user.id });
      return fail("server_error", AUTH_DELETE_FAILED_MESSAGE, 500);
    }
    await clearSession();
    log.info("account.deleted", { userId: user.id, plan: user.plan, billing });
    const response: Omit<EmptyOk, "ok"> = {};
    return ok(response);
  } catch (error) {
    log.error("account.delete_failed", error);
    return fail("server_error", "Couldn't delete your account. Please try again.", 500);
  }
}
