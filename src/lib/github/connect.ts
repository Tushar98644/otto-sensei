// Import from GitHub and the portfolio's GitHub numbers read only the account Supabase linked.

export type GitHubConnection = {
  login: string;
  // Disconnecting needs another way to sign in, so an account made with GitHub alone keeps it.
  canDisconnect: boolean;
};

export type GitHubConnectionResponse = { ok: true; connection: GitHubConnection | null };

// /auth/callback returns to the page that started connecting; `github` names what to reopen and
// `github_error` why it failed.
export const GITHUB_RETURN_PARAM = "github";
export const GITHUB_ERROR_PARAM = "github_error";

export type GitHubConnectError = "taken" | "failed";

export const GITHUB_CONNECT_ERRORS: Record<GitHubConnectError, string> = {
  taken: "That GitHub account is already connected to another Otto Sensei account.",
  failed: "GitHub didn't connect. Please try again.",
};
