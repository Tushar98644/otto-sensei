"use client";

import { Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { isOnResume } from "@/lib/github/to-projects";
import { GITHUB_PICK_LIMITS, type GitHubLookup } from "@/lib/github/types";
import type { Resume } from "@/lib/resume/schema";
import { matchesQuery, pullMeta, repoMeta } from "./format";

export type PickStepProps = {
  profile: GitHubLookup;
  resume: Resume;
  repos: readonly string[];
  pulls: readonly number[];
  onToggleRepo: (fullName: string) => void;
  onTogglePull: (id: number) => void;
};

const SEARCH_FROM = 8;

export function PickStep({ profile, resume, repos, pulls, onToggleRepo, onTogglePull }: PickStepProps) {
  const [query, setQuery] = useState("");
  const shownRepos = profile.repos.filter((repo) =>
    matchesQuery([repo.name, repo.description, repo.language, ...repo.topics], query),
  );
  const reposFull = repos.length >= GITHUB_PICK_LIMITS.repos;
  const pullsFull = pulls.length >= GITHUB_PICK_LIMITS.pulls;

  return (
    <Tabs defaultValue={profile.repos.length === 0 && profile.pulls.length > 0 ? "pulls" : "repos"}>
      <div className="flex flex-col gap-4">
        <TabList aria-label="What to import" className="w-full sm:w-auto">
          <Tab value="repos" className="flex-1 sm:flex-none">
            Repos <span className="tabular-nums text-subtle">{profile.repos.length}</span>
          </Tab>
          <Tab value="pulls" className="flex-1 sm:flex-none">
            Pull requests <span className="tabular-nums text-subtle">{profile.pulls.length}</span>
          </Tab>
        </TabList>

        <p aria-live="polite" className="text-sm/5 text-muted">
          {repos.length} of {GITHUB_PICK_LIMITS.repos} repos and {pulls.length} of{" "}
          {GITHUB_PICK_LIMITS.pulls} pull requests picked
        </p>

        <TabPanel value="repos" className="flex flex-col gap-3 focus-visible:outline-offset-4">
          {profile.repos.length > SEARCH_FROM ? (
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && query) {
                    event.preventDefault();
                    event.stopPropagation();
                    setQuery("");
                  }
                }}
                aria-label="Search your repos"
                placeholder="Search by name, language or topic"
                className="pl-10"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          ) : null}
          {profile.repos.length === 0 ? (
            <Empty>No public repos of your own on GitHub. Forks are left out, since they start as someone else&apos;s work.</Empty>
          ) : shownRepos.length === 0 ? (
            <Empty>No repos match “{query.trim()}”.</Empty>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {shownRepos.map((repo) => {
                const checked = repos.includes(repo.fullName);
                return (
                  <PickRow
                    key={repo.id}
                    checked={checked}
                    disabled={!checked && reposFull}
                    onChange={() => onToggleRepo(repo.fullName)}
                    title={repo.name}
                    detail={repo.description}
                    meta={repoMeta(repo)}
                    onResume={isOnResume(resume, { name: repo.name, link: repo.url })}
                  />
                );
              })}
            </ul>
          )}
        </TabPanel>

        <TabPanel value="pulls" className="flex flex-col gap-3 focus-visible:outline-offset-4">
          {profile.pullsUnavailable ? (
            <Alert variant="warn">GitHub was too busy to list pull requests. Go back and look again in a minute.</Alert>
          ) : profile.pulls.length === 0 ? (
            <Empty>No merged pull requests to other people&apos;s public repos.</Empty>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {profile.pulls.map((pull) => {
                const checked = pulls.includes(pull.id);
                return (
                  <PickRow
                    key={pull.id}
                    checked={checked}
                    disabled={!checked && pullsFull}
                    onChange={() => onTogglePull(pull.id)}
                    title={pull.title}
                    meta={pullMeta(pull)}
                  />
                );
              })}
            </ul>
          )}
        </TabPanel>
      </div>
    </Tabs>
  );
}

type PickRowProps = {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  title: string;
  detail?: string;
  meta: string;
  onResume?: boolean;
};

function PickRow({ checked, disabled, onChange, title, detail, meta, onResume = false }: PickRowProps) {
  return (
    <li>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-3 has-disabled:cursor-not-allowed">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-ink disabled:cursor-not-allowed"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 text-sm/5 font-medium break-words text-ink">{title}</span>
            {onResume ? <Badge>On your resume</Badge> : null}
          </span>
          {detail ? <span className="line-clamp-2 text-sm/5 text-muted">{detail}</span> : null}
          {meta ? <span className="text-xs/5 text-subtle">{meta}</span> : null}
        </span>
      </label>
    </li>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm/6 text-muted">{children}</p>;
}
