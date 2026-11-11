import type { z } from "zod";
import type { CreateShareSchema, UpdateShareSchema } from "./validation";

export const SHARE_LIMITS = {
  live: 50,
  keptRevoked: 20,
  slugLength: 14,
  writesPerHour: 60,
} as const;

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
  name: string;
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
