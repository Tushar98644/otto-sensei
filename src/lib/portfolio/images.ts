import { z } from "zod";

// Pure and client-safe. Per-project picture addresses from the round-1 Showcase template (kept on
// those pages; new templates use content uploads): an address the owner pastes, never
// an upload. The page loads it straight from that host, so only https is allowed (no mixed
// content, no data: or javascript: tricks) and the address is checked again when the page draws.

export const PROJECT_IMAGE_LIMITS = {
  urlLength: 2048,
  // Same as the resume's own cap on projects.
  perPortfolio: 30,
  projectIdLength: 64,
} as const;

export type ProjectImages = Record<string, string>;

export const PROJECT_IMAGE_MESSAGES = {
  tooLong: "That address is too long. Use a shorter link to the picture.",
  notAddress: "That isn't a web address. Paste the full link, starting with https://",
  notHttps: "Use an https:// address, so the picture loads safely on your page.",
  credentials: "Take the name and password out of the address.",
} as const;

/** Why this address can't be a project picture, in words for the person; null when it can. */
export function projectImageProblem(raw: string): string | null {
  const value = raw.trim();
  if (value === "") return null;
  if (value.length > PROJECT_IMAGE_LIMITS.urlLength) return PROJECT_IMAGE_MESSAGES.tooLong;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return PROJECT_IMAGE_MESSAGES.notAddress;
  }
  if (url.protocol !== "https:") return PROJECT_IMAGE_MESSAGES.notHttps;
  if (!url.hostname) return PROJECT_IMAGE_MESSAGES.notAddress;
  if (url.username || url.password) return PROJECT_IMAGE_MESSAGES.credentials;
  return null;
}

/** The address as it may go into an <img>, or null when it's empty or not allowed. */
export function safeImageUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (value === "" || projectImageProblem(value) !== null) return null;
  return new URL(value).href;
}

const ImageUrlSchema = z
  .string()
  .trim()
  .max(PROJECT_IMAGE_LIMITS.urlLength)
  .refine((value) => safeImageUrl(value) !== null, { message: "Not an https picture address." })
  .transform((value) => new URL(value).href);

export const ProjectImagesSchema = z
  .record(z.string().min(1).max(PROJECT_IMAGE_LIMITS.projectIdLength), ImageUrlSchema)
  .refine((images) => Object.keys(images).length <= PROJECT_IMAGE_LIMITS.perPortfolio, {
    message: `At most ${PROJECT_IMAGE_LIMITS.perPortfolio} pictures.`,
  });

/** The stored map with anything that no longer passes dropped (a row is read as untrusted). */
export function cleanProjectImages(value: unknown): ProjectImages {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const images: ProjectImages = {};
  for (const [id, url] of Object.entries(value)) {
    if (id.length === 0 || id.length > PROJECT_IMAGE_LIMITS.projectIdLength) continue;
    const safe = typeof url === "string" ? safeImageUrl(url) : null;
    if (safe) images[id] = safe;
  }
  return images;
}
