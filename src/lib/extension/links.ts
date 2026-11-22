export const CONNECT_PATH = "/extension/connect";
export const POST_PARAM = "post";
export const POST_RESUME_PARAM = "resume";
// The same word the interview prep link uses: only a link carrying it starts a generation.
export const POST_START_PARAM = "start";

const SAVED_HASH = "saved-";

export function savedPostBoardPath(postId: string): string {
  return `/dashboard/applications#${SAVED_HASH}${encodeURIComponent(postId)}`;
}

export function savedPostFromHash(hash: string): string | null {
  const value = decodeURIComponent(hash.replace(/^#/, ""));
  return value.startsWith(SAVED_HASH) ? value.slice(SAVED_HASH.length) || null : null;
}

function withPost(path: string, postId: string, resumeId: string | null, start: boolean): string {
  const query = new URLSearchParams({ [POST_PARAM]: postId });
  if (resumeId) query.set(POST_RESUME_PARAM, resumeId);
  if (start) query.set(POST_START_PARAM, "1");
  return `${path}?${query.toString()}`;
}

export function tailorPostPath(postId: string, resumeId: string | null, start = true): string {
  return withPost("/studio", postId, resumeId, start);
}

export function letterPostPath(postId: string, resumeId: string | null, start = true): string {
  return withPost("/dashboard/letters", postId, resumeId, start);
}

// Fill with Otto for a Free account: the app's own upgrade path, on Pro.
export const FILL_UPGRADE_PATH = "/account?upgrade=1&plan=pro&interval=month";
