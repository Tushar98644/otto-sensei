import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { applyAnswers } from "@/db/schema";
import { isUserId } from "@/lib/users";
import { emptyAnswers, mergeAnswers, type ApplyAnswers, type ApplyAnswersPatch } from "./answers";
import { ApplyAnswersSchema } from "./validation";

function readRow(value: unknown): ApplyAnswers {
  const parsed = ApplyAnswersSchema.safeParse(value);
  return parsed.success ? parsed.data : emptyAnswers();
}

export async function readApplyAnswers(userId: string): Promise<ApplyAnswers> {
  if (!isUserId(userId)) return emptyAnswers();
  const db = await getDb();
  const [row] = await db
    .select({ answers: applyAnswers.answers })
    .from(applyAnswers)
    .where(eq(applyAnswers.userId, userId))
    .limit(1);
  return row ? readRow(row.answers) : emptyAnswers();
}

// Merged under the account's row lock, so two tabs answering at once both land; null once the account is gone.
export async function saveApplyAnswers(
  userId: string,
  patch: ApplyAnswersPatch,
  now = Date.now(),
): Promise<ApplyAnswers | null> {
  if (!isUserId(userId)) return null;
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const [row] = await tx
      .select({ answers: applyAnswers.answers })
      .from(applyAnswers)
      .where(eq(applyAnswers.userId, userId))
      .limit(1);
    const next = ApplyAnswersSchema.parse(
      mergeAnswers(row ? readRow(row.answers) : emptyAnswers(), patch, now),
    );
    await tx
      .insert(applyAnswers)
      .values({ userId, answers: next, updatedAt: now })
      .onConflictDoUpdate({ target: applyAnswers.userId, set: { answers: next, updatedAt: now } });
    return next;
  });
}
