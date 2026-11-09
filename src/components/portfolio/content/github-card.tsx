"use client";

import { RefreshCw } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { api, isApiError } from "@/lib/api/client";
import { GITHUB_USERNAME, parseGitHubUsername } from "@/lib/github/username";
import type { GitHubStats, PortfolioContent } from "@/lib/portfolio/content";
import type { AutoContent } from "@/lib/portfolio/content-view";
import { compactNumber } from "@/lib/portfolio/metrics";
import { editContent, flushContent, setGitHub } from "./content-store";
import { AutoNote } from "./fields";
import { SectionCard, ShowRow } from "./section-card";

const ago = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function since(iso: string | null, now = Date.now()): string {
  if (!iso) return "no public activity lately";
  const days = Math.round((Date.parse(iso) - now) / 86_400_000);
  return `active ${ago.format(days, "day")}`;
}

export function GitHubCard({
  content,
  auto,
  github,
}: {
  content: PortfolioContent;
  auto: AutoContent;
  github: GitHubStats | null;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const username = content.github.username ?? auto.githubUsername ?? "";
  const value = draft ?? username;
  const bad =
    draft !== null &&
    draft.trim() !== "" &&
    !GITHUB_USERNAME.test(parseGitHubUsername(draft) ?? "");

  async function refresh() {
    // The username has to be saved first, or the server fetches the old one.
    setBusy(true);
    await flushContent();
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

  return (
    <SectionCard
      title="GitHub"
      meta={
        github
          ? `★ ${compactNumber(github.totalStars)} · ${github.publicRepos} repos · ${since(github.activity.lastActiveAt)}`
          : username
            ? "Not loaded yet"
            : "No username"
      }
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={id}>Username</Label>
          <AutoNote
            auto={content.github.username === null && auto.githubUsername !== null}
            onReset={
              content.github.username !== null && auto.githubUsername
                ? () => editContent((c) => ({ ...c, github: { username: null } }))
                : undefined
            }
          />
        </div>
        <div className="flex gap-2">
          <Input
            id={id}
            value={value}
            placeholder="octocat"
            autoComplete="off"
            spellCheck={false}
            invalid={bad}
            onChange={(event) => {
              const text = event.currentTarget.value;
              setDraft(text);
              const name = parseGitHubUsername(text);
              if (text.trim() === "") editContent((c) => ({ ...c, github: { username: null } }));
              else if (name) editContent((c) => ({ ...c, github: { username: name } }));
            }}
            onBlur={() => setDraft(null)}
          />
          <Button
            variant="secondary"
            loading={busy}
            disabled={!username}
            onClick={() => void refresh()}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
        <p className="text-sm/5 text-subtle">
          {bad
            ? "That isn't a GitHub username."
            : "Public repos, stars, languages and recent activity, read without your GitHub login and refreshed every few hours."}
        </p>
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
