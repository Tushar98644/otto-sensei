import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { feedback, users } from "@/db/schema";
import type { FeedbackInput } from "./types";

// Read by the owner in the Supabase table editor.

// The account is looked up inside the insert, so a note sent during account deletion is kept
// without it instead of failing on the foreign key.
export async function saveFeedback(
  input: FeedbackInput,
  userId: string | null,
  now = Date.now(),
): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.insert(feedback).values({
    id,
    userId: userId ? sql`(select ${users.id} from ${users} where ${users.id} = ${userId})` : null,
    kind: input.kind,
    message: input.message,
    pagePath: input.pagePath ?? null,
    createdAt: now,
  });
  return id;
}
