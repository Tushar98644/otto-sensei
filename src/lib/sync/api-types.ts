import type { PutResumeResponse, ResumesResponse } from "@/lib/api/types";

// The browser's { id: updatedAt } of the account's resumes; only ones that differ come back whole.
export const MAX_KNOWN_RESUMES = 200;

export type KnownResumes = Readonly<Record<string, number>>;

// unchanged: ids whose copy in the account is the version the browser sent.
export type ResumeList = ResumesResponse & { unchanged?: string[] };

// base: the account's version this edit was made on; keepalive: sent as the page closes.
export type PutResumeOptions = { base?: number; keepalive?: boolean };

// stale: the account holds a copy this edit wasn't made on, so nothing was written.
export type PutResumeResult = PutResumeResponse & { stale?: boolean };
