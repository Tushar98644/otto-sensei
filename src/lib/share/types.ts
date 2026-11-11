import type { z } from "zod";
import type { CreateShareSchema, UpdateShareSchema } from "./validation";

// Re-exported from @/lib/api/types.

export const SHARE_LIMITS = {
  // One per resume, so this is "resumes shared at once".
  live: 50,
  // Without their copy of the resume.
  keptRevoked: 20,
  slugLength: 14,
  writesPerHour: 60,
} as const;

// Anything else is a 404 without touching the database.
export const SHARE_SLUG = /^[A-Za-z0-9]{10,32}$/;

export function sharePath(slug: string): string {
  return `/s/${slug}`;
}
export type CreateShareBody = z.input<typeof CreateShareSchema>;
export type UpdateShareBody = z.input<typeof UpdateShareSchema>;

export type SharedLink = {
  id: string;
  resumeId: string;
  slug: string;
  // "" when none. The owner's own title for the resume stays in their browser.
  name: string;
  // To compare with the copy being edited.
  versionAt: number;
  showContact: boolean;
  allowIndexing: boolean;
  views: number;
  lastViewedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type SharesResponse = { ok: true; links: SharedLink[] };
export type ShareResponse = { ok: true; link: SharedLink; created: boolean };
