import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { writingStyles } from "@/db/schema";
import { isUserId } from "@/lib/users";
import { DEFAULT_WRITING_STYLE, type WritingStyle, type WritingStyleBody } from "./schema";

const COLUMNS = {
  tone: writingStyles.tone,
  length: writingStyles.length,
  spelling: writingStyles.spelling,
  signOff: writingStyles.signOff,
  notes: writingStyles.notes,
  updatedAt: writingStyles.updatedAt,
};

export async function readWritingStyle(userId: string): Promise<WritingStyle> {
  if (!isUserId(userId)) return DEFAULT_WRITING_STYLE;
  const db = await getDb();
  const [row] = await db
    .select(COLUMNS)
    .from(writingStyles)
    .where(eq(writingStyles.userId, userId))
    .limit(1);
  return row ?? DEFAULT_WRITING_STYLE;
}

// Under the account's row lock so it can't race account deletion; null once the account is gone.
export async function saveWritingStyle(
  userId: string,
  body: WritingStyleBody,
  now = Date.now(),
): Promise<WritingStyle | null> {
  if (!isUserId(userId)) return null;
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const set = {
      tone: body.tone,
      length: body.length,
      spelling: body.spelling,
      signOff: body.signOff,
      notes: body.notes,
      updatedAt: now,
    };
    const [row] = await tx
      .insert(writingStyles)
      .values({ userId, ...set })
      .onConflictDoUpdate({ target: writingStyles.userId, set })
      .returning(COLUMNS);
    return row ?? null;
  });
}
