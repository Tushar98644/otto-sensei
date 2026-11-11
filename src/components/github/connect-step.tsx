"use client";

import { OttoWorking } from "@/components/mascot/otto-working";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { isApiError } from "@/lib/api/client";
import type { GitHubConnection } from "@/lib/github/connect";
import type { GitHubConnectionFlow } from "./use-github-connection";

// Only a connected account can be imported from, so nobody can add someone else's public work.

export function ConnectedAs({
  connection,
  busy,
  onDisconnect,
}: {
  connection: GitHubConnection;
  busy: boolean;
  onDisconnect: () => void;
}) {
  return (
    <p className="text-sm/6 text-muted">
      Connected as <span className="font-medium text-ink">{connection.login}</span>
      {connection.canDisconnect ? (
        <>
          {" · Not you? "}
          <Button variant="link" onClick={onDisconnect} loading={busy}>
            Disconnect
          </Button>
        </>
      ) : null}
    </p>
  );
}

export type GitHubStartDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  github: GitHubConnectionFlow;
  target: string;
  lookingUp: boolean;
  error: string | null;
  onFind: () => void;
  onDisconnect: () => void;
  onSignIn: () => void;
};

export function GitHubStartDialog({
  open,
  onOpenChange,
  onClose,
  github,
  target,
  lookingUp,
  error,
  onFind,
  onDisconnect,
  onSignIn,
}: GitHubStartDialogProps) {
  const { state } = github;
  const problem = error ?? github.error;
  const alert = problem ? (
    <Alert variant="error" className="mt-4">
      {problem}
    </Alert>
  ) : null;
  const cancel = (
    <Button variant="ghost" onClick={onClose}>
      Cancel
    </Button>
  );

  if (state.status === "failed") {
    const signedOut = isApiError(state.error, "unauthorized");
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        size="sm"
        title="Import from GitHub"
        description={
          signedOut
            ? "Sign in first, then connect your GitHub account."
            : "Couldn't check your GitHub account just now."
        }
        footer={
          <>
            {cancel}
            <Button onClick={signedOut ? onSignIn : github.reload}>
              {signedOut ? "Sign in" : "Try again"}
            </Button>
          </>
        }
      />
    );
  }

  if (state.status === "ready" && !state.connection) {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        size="sm"
        title="Connect your GitHub"
        description="Otto only adds work from a GitHub account you own. Sign in to GitHub once to connect it."
        footer={
          <>
            {cancel}
            <Button onClick={() => void github.connect(target)} loading={github.busy === "connect"}>
              Connect GitHub
            </Button>
          </>
        }
      >
        <p className="text-sm/6 text-muted">
          Otto reads your public repos and merged pull requests. It never posts anything to GitHub.
        </p>
        {alert}
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Import from GitHub"
      description="Pick public repos and merged pull requests, and Otto drafts project lines from them."
      footer={
        <>
          {cancel}
          <Button onClick={onFind} loading={lookingUp || state.status === "loading"}>
            Find my work
          </Button>
        </>
      }
    >
      <div aria-live="polite">
        {state.status === "ready" && state.connection ? (
          <ConnectedAs
            connection={state.connection}
            busy={github.busy === "disconnect"}
            onDisconnect={onDisconnect}
          />
        ) : (
          <p className="text-sm/6 text-muted">Checking your GitHub account…</p>
        )}
      </div>
      {lookingUp ? <OttoWorking task="githubLookup" size="sm" className="mt-4" /> : null}
      {alert}
    </Dialog>
  );
}
