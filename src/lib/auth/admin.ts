import { isAuthApiError } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
