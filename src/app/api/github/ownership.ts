import { fail } from "@/lib/api/respond";
import type { GitHubConnection } from "@/lib/github/connect";
import { log } from "@/lib/log";

// A username in the request is only checked against the connected account, never trusted alone.

export const NOT_CONNECTED = "Connect your GitHub account to import its projects.";

/** The connected login when `username` names it (any case), else the 403 to send. */
export function ownGitHubLogin(
  connection: GitHubConnection | null,
  username: string,
): string | Response {
  if (!connection) return fail("github_not_connected", NOT_CONNECTED, 403);
  if (connection.login.toLowerCase() === username.toLowerCase()) return connection.login;
  log.info("github.not_own_account");
  return fail(
    "github_not_connected",
    `You can only import from the GitHub account you connected, ${connection.login}.`,
    403,
  );
}
