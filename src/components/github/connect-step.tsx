"use client";

import { OttoWorking } from "@/components/mascot/otto-working";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { isApiError } from "@/lib/api/client";
import type { GitHubConnection } from "@/lib/github/connect";
import type { GitHubConnectionFlow } from "./use-github-connection";
import { rich } from "@/i18n/rich";
import { useGitHubWords } from "./use-github-words";

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
  const t = useGitHubWords().connect;
  return (
    <p className="text-sm/6 text-muted">
      {rich(
        t.connectedAs,
        { b: (chunk) => <span className="font-medium text-ink">{chunk}</span> },
        { login: connection.login },
      )}
      {connection.canDisconnect ? (
        <>
          {t.notYou}
          <Button variant="link" onClick={onDisconnect} loading={busy}>
            {t.disconnect}
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
  const t = useGitHubWords().connect;
  const problem = error ?? github.error;
  const alert = problem ? (
    <Alert variant="error" className="mt-4">
      {problem}
    </Alert>
  ) : null;
  const cancel = (
    <Button variant="ghost" onClick={onClose}>
      {t.cancel}
    </Button>
  );

  if (state.status === "failed") {
    const signedOut = isApiError(state.error, "unauthorized");
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        size="sm"
        title={t.title}
        description={signedOut ? t.signInFirst : t.checkFailed}
        footer={
          <>
            {cancel}
            <Button onClick={signedOut ? onSignIn : github.reload}>
              {signedOut ? t.signIn : t.tryAgain}
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
        title={t.connectTitle}
        description={t.connectDescription}
        footer={
          <>
            {cancel}
            <Button onClick={() => void github.connect(target)} loading={github.busy === "connect"}>
              {t.connect}
            </Button>
          </>
        }
      >
        <p className="text-sm/6 text-muted">{t.reads}</p>
        {alert}
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={t.title}
      description={t.description}
      footer={
        <>
          {cancel}
          <Button onClick={onFind} loading={lookingUp || state.status === "loading"}>
            {t.find}
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
          <p className="text-sm/6 text-muted">{t.checking}</p>
        )}
      </div>
      {lookingUp ? <OttoWorking task="githubLookup" size="sm" className="mt-4" /> : null}
      {alert}
    </Dialog>
  );
}
