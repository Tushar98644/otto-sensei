"use client";

import { useEffect, useState } from "react";
import { api, isApiError } from "@/lib/api/client";
import type { GitHubConnection } from "@/lib/github/connect";
import { returnPathFor } from "./connect-return";
import { useGitHubWords } from "./use-github-words";

export type GitHubConnectionState =
  | { status: "loading" }
  | { status: "ready"; connection: GitHubConnection | null }
  | { status: "failed"; error: unknown };

function messageOf(error: unknown, fallback: string, offline: string): string {
  if (isApiError(error, "network_error")) return offline;
  return isApiError(error) ? error.message : fallback;
}

export type GitHubConnectionFlow = ReturnType<typeof useGitHubConnection>;

export function useGitHubConnection(active: boolean) {
  const t = useGitHubWords().connect;
  const [state, setState] = useState<GitHubConnectionState>({ status: "loading" });
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState<"connect" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let live = true;
    api.githubConnection().then(
      ({ connection }) => {
        if (live) setState({ status: "ready", connection });
      },
      (failure: unknown) => {
        if (live) setState({ status: "failed", error: failure });
      },
    );
    return () => {
      live = false;
    };
  }, [active, round]);

  async function connect(target: string) {
    setBusy("connect");
    setError(null);
    try {
      const { url } = await api.connectGitHub({ next: returnPathFor(target) });
      window.location.assign(url);
    } catch (failure) {
      setBusy(null);
      setError(messageOf(failure, t.startFailed, t.offline));
    }
  }

  async function disconnect(): Promise<boolean> {
    setBusy("disconnect");
    setError(null);
    try {
      const { connection } = await api.disconnectGitHub();
      setState({ status: "ready", connection });
      return true;
    } catch (failure) {
      setError(messageOf(failure, t.disconnectFailed, t.offline));
      return false;
    } finally {
      setBusy(null);
    }
  }

  return {
    state,
    login: state.status === "ready" ? (state.connection?.login ?? null) : null,
    busy,
    error,
    connect,
    disconnect,
    reload: () => {
      setError(null);
      setState({ status: "loading" });
      setRound((value) => value + 1);
    },
  };
}
