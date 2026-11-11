"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useGitHubReturn } from "@/components/github/connect-return";
import { ConnectedAs } from "@/components/github/connect-step";
import { useGitHubConnection } from "@/components/github/use-github-connection";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { api, isApiError } from "@/lib/api/client";
import type { GitHubStats, PortfolioContent } from "@/lib/portfolio/content";
import { compactNumber } from "@/lib/portfolio/metrics";
import { setGitHub } from "./content-store";
import { SectionCard, ShowRow } from "./section-card";

const ago = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
// What the way back from "Connect GitHub" names on this page (see connect-return.ts).
const RETURN_TARGET = "portfolio";

function since(iso: string | null, now = Date.now()): string {
  if (!iso) return "no public activity lately";
  const days = Math.round((Date.parse(iso) - now) / 86_400_000);
  return `active ${ago.format(days, "day")}`;
}

/**
 * The page's GitHub numbers. They come only from the GitHub account the owner connected, never a
 * typed username, so a page can't show someone else's stars as its owner's.
 */
export function GitHubCard({
  content,
  github,
}: {
  content: PortfolioContent;
  github: GitHubStats | null;
}) {
  const connection = useGitHubConnection(true);
  const [busy, setBusy] = useState(false);
  const { state } = connection;
  const connected = state.status === "ready" ? state.connection : null;

  useGitHubReturn(RETURN_TARGET, (error) => {
    if (!error) {
      toast({
        title: "GitHub connected",
        description: "Your page can show your GitHub numbers now.",
        variant: "success",
      });
    }
  });

  async function refresh() {
    setBusy(true);
    try {
      const answer = await api.refreshPortfolioGitHub();
      setGitHub(answer.github);
    } catch (error) {
      toast({
        title: "Couldn't reach GitHub",
        description: isApiError(error) ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (await connection.disconnect()) setGitHub(null);
  }

  const meta = github
    ? `★ ${compactNumber(github.totalStars)} · ${github.publicRepos} repos · ${since(github.activity.lastActiveAt)}`
    : connected
      ? "Not loaded yet"
      : state.status === "ready"
        ? "Not connected"
        : undefined;

  return (
    <SectionCard title="GitHub" meta={meta}>
      <div className="flex flex-col gap-2" aria-live="polite">
        {connected ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ConnectedAs
                connection={connected}
                busy={connection.busy === "disconnect"}
                onDisconnect={() => void disconnect()}
              />
              <Button variant="secondary" loading={busy} onClick={() => void refresh()}>
                <RefreshCw className="size-4" />
                Refresh
              </Button>
            </div>
            <p className="text-sm/5 text-subtle">
              Public repos, stars, languages and recent activity from your connected account,
              refreshed every few hours.
            </p>
          </>
        ) : state.status === "ready" ? (
          <>
            <p className="text-sm/6 text-muted">
              Connect your GitHub to show your stars, repos and languages. Only your own account can
              be shown.
            </p>
            <Button
              variant="secondary"
              className="self-start"
              loading={connection.busy === "connect"}
              onClick={() => void connection.connect(RETURN_TARGET)}
            >
              Connect GitHub
            </Button>
          </>
        ) : state.status === "failed" ? (
          <>
            <p className="text-sm/6 text-muted">
              Couldn&apos;t check your GitHub account just now.
            </p>
            <Button variant="secondary" className="self-start" onClick={connection.reload}>
              Try again
            </Button>
          </>
        ) : (
          <p className="text-sm/6 text-muted">Checking your GitHub account…</p>
        )}
        {connection.error ? <Alert variant="error">{connection.error}</Alert> : null}
      </div>
      {github ? (
        <dl className="grid grid-cols-3 gap-3 rounded-xl bg-surface-muted p-3 text-center">
          <div>
            <dt className="text-xs/4 text-subtle">Stars</dt>
            <dd className="text-lg/7 font-semibold text-ink tabular-nums">
              {compactNumber(github.totalStars)}
            </dd>
          </div>
          <div>
            <dt className="text-xs/4 text-subtle">Repos</dt>
            <dd className="text-lg/7 font-semibold text-ink tabular-nums">{github.publicRepos}</dd>
          </div>
          <div>
            <dt className="text-xs/4 text-subtle">Followers</dt>
            <dd className="text-lg/7 font-semibold text-ink tabular-nums">
              {compactNumber(github.followers)}
            </dd>
          </div>
          {github.languages.length > 0 ? (
            <div className="col-span-3 text-left">
              <dt className="sr-only">Languages</dt>
              <dd className="text-sm/6 text-muted">
                {github.languages
                  .map((language) => `${language.name} ${language.percent}%`)
                  .join(" · ")}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <ShowRow content={content} section="github" label="Show GitHub numbers on my page" />
    </SectionCard>
  );
}
