import { eq } from "drizzle-orm";
import type { Tx } from "./client";
import { users } from "./schema";

// Server-only. SQLite ran one writer at a time, so "count, then insert" in one statement could
// enforce a cap. Postgres runs writers side by side, so capped writes for one account first take
// this lock, which queues them (and an account deletion) behind each other until commit.

/** Locks the user's row for this transaction. False when the account no longer exists. */
export async function lockUser(tx: Tx, userId: string): Promise<boolean> {
  const rows = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    // "no key update" still lets foreign-key checks from other tables share the row.
    .for("no key update");
  return rows.length > 0;
}
