import { z } from "zod";
import { ResumeSchema } from "@/lib/resume/schema";

// Client-safe contract for share links: the request bodies /api/share validates and what it sends
// back. Re-exported from @/lib/api/types.

export const SHARE_LIMITS = {
  // Live links per account. One per resume, so this is "resumes shared at once".
  live: 50,
  // Turned-off links kept per account (without their copy of the resume), newest first.
  keptRevoked: 20,
  slugLength: 14,
  // Links made, updated or changed per account per hour.
  writesPerHour: 60,
} as const;

// What a link's slug may look like. Anything else is a 404 without touching the database.
export const SHARE_SLUG = /^[A-Za-z0-9]{10,32}$/;

export function sharePath(slug: string): string {
  return `/s/${slug}`;
}

// POST /api/share: makes the resume's link, or points its existing link at this version.
export const CreateShareSchema = z.object({
  resume: ResumeSchema,
  showContact: z.boolean().default(false),
  allowIndexing: z.boolean().default(false),
});
export type CreateShareBody = z.input<typeof CreateShareSchema>;

// PATCH /api/share/:id: changes who sees what, without changing the version shown.
export const UpdateShareSchema = z
  .object({ showContact: z.boolean().optional(), allowIndexing: z.boolean().optional() })
  .refine((body) => body.showContact !== undefined || body.allowIndexing !== undefined, {
    message: "Nothing to change.",
  });
export type UpdateShareBody = z.input<typeof UpdateShareSchema>;

export type SharedLink = {
  id: string;
  resumeId: string;
  slug: string;
  // The name on the shared copy, "" when it has none. The owner's own title for the resume stays
  // in their browser.
  name: string;
  // The resume's updatedAt when this version was shared, to compare with the copy being edited.
  versionAt: number;
  showContact: boolean;
  allowIndexing: boolean;
  views: number;
  lastViewedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

// GET /api/share: the account's live links, newest first (at most SHARE_LIMITS.live).
export type SharesResponse = { ok: true; links: SharedLink[] };
// created: false when the resume already had a link and it now shows this version.
export type ShareResponse = { ok: true; link: SharedLink; created: boolean };
