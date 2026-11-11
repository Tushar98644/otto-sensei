import { eq } from "drizzle-orm";
import type { Tx } from "./client";
import { users } from "./schema";

// Serializes capped writes (and account deletion) for one account until commit.

export async function lockUser(tx: Tx, userId: string): Promise<boolean> {
  const rows = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    // "no key update" still lets foreign-key checks from other tables share the row.
    .for("no key update");
  return rows.length > 0;
}
