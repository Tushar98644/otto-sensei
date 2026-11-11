import { eq } from "drizzle-orm";
import type { Tx } from "./client";
import { users } from "./schema";

// Postgres runs writers concurrently, so capped writes for one account take this lock first, which
// queues them (and an account deletion) behind each other until commit.

/** False when the account no longer exists. */
export async function lockUser(tx: Tx, userId: string): Promise<boolean> {
  const rows = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    // "no key update" still lets foreign-key checks from other tables share the row.
    .for("no key update");
  return rows.length > 0;
}
