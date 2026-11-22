import { and, eq, gte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";
import { MINUTE_MS } from "@/lib/time";
import { jobSiteOf, SITE_NAMES } from "./urls";

// Undo on the "Added to Applications" note reaches only an application this new.
export const UNDO_MS = 30 * MINUTE_MS;

export function applicationPath(id: string): string {
  return `/dashboard/applications/${encodeURIComponent(id)}`;
}

// A post that names no company still needs one on the board: the board's own name in the link.
export function companyFromLink(url: string): string {
  try {
    const link = new URL(url);
    const site = jobSiteOf(link.href);
    const slug =
      site === "workday"
        ? link.hostname.split(".")[0]
        : site === "greenhouse" && link.pathname.startsWith("/embed/")
          ? link.searchParams.get("for")
          : link.pathname.split("/").filter(Boolean)[0];
    const name = (slug ?? "").replace(/[-_]+/g, " ").trim();
    if (name) return name.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
    return site === "other" ? link.hostname.replace(/^www\./, "") : SITE_NAMES[site];
  } catch {
    return "";
  }
}

export async function undoApplication(
  userId: string,
  id: string,
  now = Date.now(),
): Promise<boolean> {
  const db = await getDb();
  const gone = await db
    .delete(applications)
    .where(
      and(
        eq(applications.userId, userId),
        eq(applications.id, id),
        gte(applications.createdAt, now - UNDO_MS),
      ),
    )
    .returning({ id: applications.id });
  return gone.length > 0;
}
