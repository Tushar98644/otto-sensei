import type { PlanId } from "@/config/plans";
import type { WorkProfile } from "@/lib/eligibility/profile";
import type { PlaceChoice } from "@/lib/job-feed/types";
import type { ExtensionAccess } from "./plan";
import type { JobSite } from "./urls";

export const EXTENSION_TOKEN_PREFIX = "otto_ext_";

export const EXTENSION_LIMITS = {
  tokenDays: 90,
  // A sliding expiry only moves once a day, so using the extension isn't a write per request.
  slideAfterMs: 24 * 60 * 60 * 1000,
  tokensPerUser: 10,
  savedPosts: 2_000,
  urlChars: 2_048,
  titleChars: 200,
  companyChars: 200,
  locationChars: 200,
  postChars: 20_000,
  minPostChars: 80,
} as const;

export type ExtensionResume = { id: string; title: string; updatedAt: number; text: string };

export type SavedPostRef = { key: string; id: string; savedAt: number };

export type ExtensionProfile = {
  version: string;
  email: string;
  plan: PlanId;
  access: ExtensionAccess;
  // Newest first: the first is the one the badge matches against until another is picked.
  resumes: ExtensionResume[];
  workProfile: WorkProfile | null;
  lookingFor: { place: PlaceChoice; remote: boolean };
  saved: SavedPostRef[];
};

export type ExtensionProfileBody =
  { unchanged: false; profile: ExtensionProfile } | { unchanged: true; version: string };
export type ExtensionProfileResponse = { ok: true } & ExtensionProfileBody;

export type SavePostBody = {
  url: string;
  site: JobSite;
  title: string;
  company: string;
  location: string;
  text: string;
};

export type SavePostResponse = {
  ok: true;
  post: SavedPostRef & { created: boolean };
  // A path on Otto: the extension opens it on the origin it was built for.
  boardPath: string;
};

export type SavedPost = {
  id: string;
  url: string;
  site: JobSite;
  title: string;
  company: string;
  location: string;
  savedAt: number;
  updatedAt: number;
};

export type SavedPostsResponse = { ok: true; posts: SavedPost[] };
export type SavedPostResponse = { ok: true; post: SavedPost & { text: string } };

export type ExtensionConnection = { connectedAt: number; lastUsedAt: number; browsers: number };
export type ExtensionConnectionResponse = { ok: true; connection: ExtensionConnection | null };
export type ExtensionConnectResponse = { ok: true; token: string; expiresAt: number };
