import { createHash, randomUUID } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { savedPosts } from "@/db/schema";
import { cleanLine } from "@/lib/applications/schema";
import { EXTENSION_LIMITS, type SavedPost, type SavedPostRef } from "./types";
import { canonicalJobUrl, JOB_SITES, type JobSite } from "./urls";

export function postKey(canonicalUrl: string): string {
  return createHash("sha256").update(canonicalUrl).digest("base64url");
}

export type PostInput = {
  url: string;
  site: JobSite;
  title: string;
  company: string;
  location: string;
  text: string;
};

export type SavePostResult =
  | { status: "saved"; ref: SavedPostRef; created: boolean }
  | { status: "bad_url" }
  | { status: "limit_reached" }
  | { status: "no_user" };

const LIST_COLUMNS = {
  id: savedPosts.id,
  url: savedPosts.url,
  site: savedPosts.site,
  title: savedPosts.title,
  company: savedPosts.company,
  location: savedPosts.location,
  savedAt: savedPosts.savedAt,
  updatedAt: savedPosts.updatedAt,
};

function readSite(value: string): JobSite {
  return (JOB_SITES as readonly string[]).includes(value) ? (value as JobSite) : "other";
}

function toSavedPost(row: Omit<SavedPost, "site"> & { site: string }): SavedPost {
  return { ...row, site: readSite(row.site) };
}

function clip(value: string, max: number): string {
  return cleanLine(value).slice(0, max);
}

// Saving a link already saved refreshes its copy of the post and keeps its place on the board.
export async function savePost(
  userId: string,
  input: PostInput,
  now = Date.now(),
): Promise<SavePostResult> {
  const url = canonicalJobUrl(input.url);
  if (!url || url.length > EXTENSION_LIMITS.urlChars) return { status: "bad_url" };
  const key = postKey(url);
  const values = {
    url,
    site: input.site,
    title: clip(input.title, EXTENSION_LIMITS.titleChars),
    company: clip(input.company, EXTENSION_LIMITS.companyChars),
    location: clip(input.location, EXTENSION_LIMITS.locationChars),
    post: input.text.trim().slice(0, EXTENSION_LIMITS.postChars),
    updatedAt: now,
  };
  const db = await getDb();
  return db.transaction(async (tx): Promise<SavePostResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const [existing] = await tx
      .select({ id: savedPosts.id })
      .from(savedPosts)
      .where(and(eq(savedPosts.userId, userId), eq(savedPosts.urlKey, key)))
      .limit(1);
    if (!existing) {
      const [held] = await tx
        .select({ total: count() })
        .from(savedPosts)
        .where(eq(savedPosts.userId, userId));
      if ((held?.total ?? 0) >= EXTENSION_LIMITS.savedPosts) return { status: "limit_reached" };
    }
    const [row] = await tx
      .insert(savedPosts)
      .values({ id: randomUUID(), userId, urlKey: key, savedAt: now, ...values })
      .onConflictDoUpdate({ target: [savedPosts.userId, savedPosts.urlKey], set: values })
      .returning({ id: savedPosts.id, savedAt: savedPosts.savedAt });
    if (!row) throw new Error("savePost: upsert returned no row");
    return { status: "saved", ref: { key, id: row.id, savedAt: row.savedAt }, created: !existing };
  });
}

export async function listSavedPosts(userId: string): Promise<SavedPost[]> {
  const db = await getDb();
  const rows = await db
    .select(LIST_COLUMNS)
    .from(savedPosts)
    .where(eq(savedPosts.userId, userId))
    .orderBy(desc(savedPosts.savedAt), desc(savedPosts.id))
    .limit(EXTENSION_LIMITS.savedPosts);
  return rows.map(toSavedPost);
}

export async function savedPostRefs(userId: string): Promise<SavedPostRef[]> {
  const db = await getDb();
  return db
    .select({ key: savedPosts.urlKey, id: savedPosts.id, savedAt: savedPosts.savedAt })
    .from(savedPosts)
    .where(eq(savedPosts.userId, userId))
    .orderBy(desc(savedPosts.savedAt), desc(savedPosts.id))
    .limit(EXTENSION_LIMITS.savedPosts);
}

export async function getSavedPost(
  userId: string,
  id: string,
): Promise<(SavedPost & { text: string }) | null> {
  const db = await getDb();
  const [row] = await db
    .select({ ...LIST_COLUMNS, text: savedPosts.post })
    .from(savedPosts)
    .where(and(eq(savedPosts.userId, userId), eq(savedPosts.id, id)))
    .limit(1);
  return row ? { ...toSavedPost(row), text: row.text } : null;
}

export async function deleteSavedPost(userId: string, id: string): Promise<boolean> {
  const db = await getDb();
  const gone = await db
    .delete(savedPosts)
    .where(and(eq(savedPosts.userId, userId), eq(savedPosts.id, id)))
    .returning({ id: savedPosts.id });
  return gone.length > 0;
}

export async function savedPostsVersion(userId: string): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .select({ total: count(), newest: sql<string | null>`max(${savedPosts.updatedAt})::text` })
    .from(savedPosts)
    .where(eq(savedPosts.userId, userId));
  return `${row?.total ?? 0}:${row?.newest ?? ""}`;
}
