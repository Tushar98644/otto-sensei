// Client-safe. "Connect GitHub": the person signs in to GitHub once and Supabase links that account
// to theirs. Import from GitHub and the portfolio's GitHub numbers read only that account.

export type GitHubConnection = {
  login: string;
  // Disconnecting needs another way to sign in, so an account made with GitHub alone keeps it.
  canDisconnect: boolean;
};

// GET and DELETE /api/github/connection. POST answers { url } to send the browser to.
export type GitHubConnectionResponse = { ok: true; connection: GitHubConnection | null };

// The way back from GitHub: /auth/callback returns to the page that started connecting, where
// `github` names what to reopen (a resume id, or "portfolio") and `github_error` why it failed.
export const GITHUB_RETURN_PARAM = "github";
export const GITHUB_ERROR_PARAM = "github_error";

export type GitHubConnectError = "taken" | "failed";

export const GITHUB_CONNECT_ERRORS: Record<GitHubConnectError, string> = {
  taken: "That GitHub account is already connected to another Otto Sensei account.",
  failed: "GitHub didn't connect. Please try again.",
};
