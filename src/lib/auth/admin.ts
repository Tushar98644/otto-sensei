import { isAuthApiError } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { deleteDevIdentity } from "./dev";
import { devAuthActive } from "./dev-mode";

// Server-only. Removing the Supabase Auth user, the last step of deleting an account.

/** False without a Supabase secret key: deleting an account must then wait until one is set. */
export function canDeleteAuthUsers(): boolean {
  return devAuthActive() || createSupabaseAdminClient() !== null;
}

/** Deletes the auth user and every session it has. An already deleted user counts as done. */
export async function deleteAuthUser(userId: string): Promise<void> {
  if (devAuthActive()) return deleteDevIdentity(userId);
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase secret key is not configured");
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error && !(isAuthApiError(error) && error.status === 404)) {
    throw new Error("Supabase couldn't delete the auth user", { cause: error });
  }
}
