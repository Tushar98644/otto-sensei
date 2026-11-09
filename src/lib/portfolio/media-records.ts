import { and, eq, inArray, isNotNull, isNull, lt, notInArray, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { portfolioMedia } from "@/db/schema";
import { log } from "@/lib/log";
import type { MediaUsage, UploadedImage } from "./content";
import { MEDIA_LIMITS, mediaKey, type MediaKind } from "./media";
import type { ProcessedImage } from "./media-image";
import { mediaStore, type MediaStore } from "./media-store";

// Server-only. Uploaded portfolio pictures: one row per stored file, filtered by user_id on every
// query. A file the saved content stops using is "detached" and deleted after a grace period
// (MEDIA_LIMITS.detachedGraceMs), so Undo can still bring it back; deleting the portfolio or the
// account deletes all of them at once.

export async function mediaUsage(userId: string): Promise<MediaUsage> {
  const db = await getDb();
  const [row] = await db
    .select({
      files: sql<number>`count(*)::int`,
      bytes: sql<number>`coalesce(sum(${portfolioMedia.bytes}), 0)::int`,
    })
    .from(portfolioMedia)
    .where(eq(portfolioMedia.userId, userId));
  return {
    files: Number(row?.files ?? 0),
    bytes: Number(row?.bytes ?? 0),
    maxFiles: MEDIA_LIMITS.maxFiles,
    maxBytes: MEDIA_LIMITS.maxBytes,
  };
}

export type StoreResult =
  { status: "stored"; image: UploadedImage } | { status: "full" } | { status: "no_user" };

/**
 * Keeps one processed picture: claims room under the account's caps (serialised per account), then
 * writes the file. The row is taken back if the store refuses the file, so the caps stay true.
 */
export async function storeMedia(
  userId: string,
  kind: MediaKind,
  image: ProcessedImage,
  store: MediaStore,
  now = Date.now(),
): Promise<StoreResult> {
  // Old detached files make room first.
  await sweepDetachedMedia(userId, now, store);
  const id = crypto.randomUUID();
  const key = mediaKey(userId, id);
  const db = await getDb();
  const claimed = await db.transaction(async (tx): Promise<StoreResult | null> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const [usage] = await tx
      .select({
        files: sql<number>`count(*)::int`,
        bytes: sql<number>`coalesce(sum(${portfolioMedia.bytes}), 0)::int`,
      })
      .from(portfolioMedia)
      .where(eq(portfolioMedia.userId, userId));
    const files = Number(usage?.files ?? 0);
    const bytes = Number(usage?.bytes ?? 0);
    if (
      files + 1 > MEDIA_LIMITS.maxFiles ||
      bytes + image.bytes.byteLength > MEDIA_LIMITS.maxBytes
    ) {
      return { status: "full" };
    }
    await tx.insert(portfolioMedia).values({
      id,
      userId,
      key,
      kind,
      contentType: "image/webp",
      bytes: image.bytes.byteLength,
      width: image.width,
      height: image.height,
      createdAt: now,
      // Unused until a saved content document points at it.
      detachedAt: now,
    });
    return null;
  });
  if (claimed) return claimed;
  try {
    await store.put(key, image.bytes, "image/webp");
  } catch (error) {
    await db.delete(portfolioMedia).where(eq(portfolioMedia.id, id));
    throw error;
  }
  return {
    status: "stored",
    image: { kind: "upload", id, key, width: image.width, height: image.height, alt: "" },
  };
}

/** Which of these upload refs really are this account's files (id and key both match). */
export async function ownedMedia(
  tx: Tx,
  userId: string,
  refs: readonly UploadedImage[],
): Promise<boolean> {
  if (refs.length === 0) return true;
  const ids = [...new Set(refs.map((ref) => ref.id))];
  const rows = await tx
    .select({ id: portfolioMedia.id, key: portfolioMedia.key })
    .from(portfolioMedia)
    .where(and(eq(portfolioMedia.userId, userId), inArray(portfolioMedia.id, ids)));
  const keys = new Map(rows.map((row) => [row.id, row.key]));
  return refs.every((ref) => keys.get(ref.id) === ref.key);
}

/** Marks what the saved content uses as in use, and everything else as detached from now. */
export async function attachMedia(
  tx: Tx,
  userId: string,
  inUse: readonly string[],
  now: number,
): Promise<void> {
  const ids = [...new Set(inUse)];
  const mine = eq(portfolioMedia.userId, userId);
  if (ids.length > 0) {
    await tx
      .update(portfolioMedia)
      .set({ detachedAt: null })
      .where(and(mine, inArray(portfolioMedia.id, ids), isNotNull(portfolioMedia.detachedAt)));
  }
  await tx
    .update(portfolioMedia)
    .set({ detachedAt: now })
    .where(
      and(
        mine,
        isNull(portfolioMedia.detachedAt),
        ...(ids.length > 0 ? [notInArray(portfolioMedia.id, ids)] : []),
      ),
    );
}

async function removeRows(
  userId: string,
  rows: { id: string; key: string }[],
  store: MediaStore | null,
): Promise<number> {
  if (rows.length === 0) return 0;
  if (!store) throw new Error("No media store on this server, so its files can't be deleted");
  // Files first: a row left behind is retried next time, a file left behind would be lost track of.
  if (store) await store.remove(rows.map((row) => row.key));
  const db = await getDb();
  await db.delete(portfolioMedia).where(
    and(
      eq(portfolioMedia.userId, userId),
      inArray(
        portfolioMedia.id,
        rows.map((row) => row.id),
      ),
    ),
  );
  return rows.length;
}

/** Deletes this account's files that have been unused for longer than the grace period. */
export async function sweepDetachedMedia(
  userId: string,
  now = Date.now(),
  store: MediaStore | null = mediaStore(),
): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ id: portfolioMedia.id, key: portfolioMedia.key })
    .from(portfolioMedia)
    .where(
      and(
        eq(portfolioMedia.userId, userId),
        isNotNull(portfolioMedia.detachedAt),
        lt(portfolioMedia.detachedAt, now - MEDIA_LIMITS.detachedGraceMs),
      ),
    );
  try {
    return await removeRows(userId, rows, store);
  } catch (error) {
    log.warn("portfolio.media_sweep_failed", { files: rows.length }, error);
    return 0;
  }
}

/** One file, now (the editor's "Remove" after its Undo window, or a failed save's leftovers). */
export async function deleteMedia(
  userId: string,
  id: string,
  store: MediaStore | null = mediaStore(),
): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ id: portfolioMedia.id, key: portfolioMedia.key })
    .from(portfolioMedia)
    .where(and(eq(portfolioMedia.userId, userId), eq(portfolioMedia.id, id)));
  return (await removeRows(userId, rows, store)) > 0;
}

/**
 * Every file the account has, for deleting the portfolio or the account. Throws when the store
 * can't delete them, so an account deletion stops before its rows (and the keys) are gone.
 */
export async function deleteAllMedia(
  userId: string,
  store: MediaStore | null = mediaStore(),
): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ id: portfolioMedia.id, key: portfolioMedia.key })
    .from(portfolioMedia)
    .where(eq(portfolioMedia.userId, userId));
  return removeRows(userId, rows, store);
}
