import type { ExtensionProfile } from "@/lib/extension/types";
import { chrome } from "./chrome";

// Everything Otto keeps in chrome.storage.local, under these keys only.
export type Stored = {
  token: string | null;
  tokenExpiresAt: number | null;
  profile: ExtensionProfile | null;
  profileAt: number | null;
  resumeId: string | null;
  collapsed: boolean;
};

const KEYS: (keyof Stored)[] = [
  "token",
  "tokenExpiresAt",
  "profile",
  "profileAt",
  "resumeId",
  "collapsed",
];

export async function readStored(): Promise<Stored> {
  const raw = await chrome.storage.local.get(KEYS);
  return {
    token: typeof raw.token === "string" ? raw.token : null,
    tokenExpiresAt: typeof raw.tokenExpiresAt === "number" ? raw.tokenExpiresAt : null,
    profile: (raw.profile as ExtensionProfile | undefined) ?? null,
    profileAt: typeof raw.profileAt === "number" ? raw.profileAt : null,
    resumeId: typeof raw.resumeId === "string" ? raw.resumeId : null,
    collapsed: raw.collapsed === true,
  };
}

export function writeStored(patch: Partial<Stored>): Promise<void> {
  return chrome.storage.local.set(patch);
}

export function clearAccount(): Promise<void> {
  return chrome.storage.local.remove([
    "token",
    "tokenExpiresAt",
    "profile",
    "profileAt",
    "resumeId",
  ]);
}

// The resume picked in the panel if it's still there, else the newest.
export function chosenResume(profile: ExtensionProfile | null, resumeId: string | null) {
  if (!profile) return null;
  return profile.resumes.find((resume) => resume.id === resumeId) ?? profile.resumes[0] ?? null;
}
