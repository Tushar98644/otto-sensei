// Every API path and search query is built from a name that passed this, so nothing is injected.
export const GITHUB_USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

const PROFILE_LINK = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)\/?(?:[?#].*)?$/i;

export function parseGitHubUsername(input: string): string | null {
  const value = input.trim();
  const fromLink = PROFILE_LINK.exec(value)?.[1];
  const name = (fromLink ?? value).replace(/^@/, "");
  return GITHUB_USERNAME.test(name) ? name : null;
}
