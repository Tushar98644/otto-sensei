export type GitHubConnection = {
  login: string;
  canDisconnect: boolean;
};

export type GitHubConnectionResponse = { ok: true; connection: GitHubConnection | null };

export const GITHUB_RETURN_PARAM = "github";
export const GITHUB_ERROR_PARAM = "github_error";

export type GitHubConnectError = "taken" | "failed";

export const GITHUB_CONNECT_ERRORS: Record<GitHubConnectError, string> = {
  taken: "That GitHub account is already connected to another Otto Sensei account.",
  failed: "GitHub didn't connect. Please try again.",
};
