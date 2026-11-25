"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api/client";
import { addGitHubProjects, isOnResume, MAX_PROJECTS } from "@/lib/github/to-projects";
import { GITHUB_PICK_LIMITS, type GitHubDraftResult } from "@/lib/github/types";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { GitHubStartDialog } from "./connect-step";
import { PickStep } from "./pick-step";
import { ReviewStep } from "./review-step";
import { useGitHubConnection } from "./use-github-connection";
import { useGitHubImport, type GitHubImport } from "./use-github-import";
import { useFormat } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { useGitHubWords } from "./use-github-words";

export type GitHubImportDialogProps = {
  resume: Resume;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: (resume: Resume) => void;
};

function alreadyOnFor(resume: Resume) {
  return (draft: GitHubDraftResult) =>
    draft.entries.filter((entry) => isOnResume(resume, entry)).map((entry) => entry.key);
}

function projectCount(flow: GitHubImport): number {
  const { profile, repos, pulls } = flow.state;
  const pullRepos = new Set(
    (profile?.pulls ?? []).filter((pull) => pulls.includes(pull.id)).map((pull) => pull.repo),
  );
  return repos.length + pullRepos.size;
}

export function GitHubImportDialog({
  resume,
  open,
  onOpenChange,
  onAdded,
}: GitHubImportDialogProps) {
  const gate = useAccountGate();
  const words = useGitHubWords();
  const format = useFormat();
  const github = useGitHubConnection(open);
  const flow = useGitHubImport(resume, github.login, alreadyOnFor(resume), (error) => {
    if (isApiError(error, "github_not_connected")) github.reload();
    else gate.handleApiError(error, "github");
  });
  const updateResume = useStudioStore((s) => s.updateResume);
  const { state } = flow;
  const autoStarted = useRef(false);
  const login = github.login;
  const startLookup = useEffectEvent(() => void flow.lookup());

  useEffect(() => {
    if (!open || autoStarted.current || !login) return;
    autoStarted.current = true;
    const timer = window.setTimeout(startLookup, 0);
    return () => window.clearTimeout(timer);
  }, [open, login]);

  function close() {
    flow.reset();
    autoStarted.current = false;
    onOpenChange(false);
  }

  async function disconnect() {
    flow.reset();
    if (await github.disconnect()) autoStarted.current = false;
  }

  async function signIn() {
    if (await gate.requireUser(words.connect.signInReason)) github.reload();
  }

  function add() {
    const chosen = (state.draft?.entries ?? []).filter((entry) => !state.left.includes(entry.key));
    if (chosen.length === 0) return;
    const { added, skipped } = addGitHubProjects(resume, chosen);
    if (added > 0) {
      updateResume(resume.id, (current) => addGitHubProjects(current, chosen).resume, {
        label: words.added.undo,
      });
      const latest = useStudioStore.getState().resumes[resume.id];
      if (latest) onAdded?.(latest);
    }
    toast(
      added > 0
        ? {
            title: format.plural(words.added.title, added),
            description:
              skipped > 0
                ? fmt(words.added.skipped, { max: MAX_PROJECTS, skipped })
                : words.added.where,
            variant: "success",
          }
        : {
            title: fmt(words.added.full, { max: MAX_PROJECTS }),
            description: words.added.makeRoom,
            variant: "error",
          },
    );
    close();
  }

  const count = projectCount(flow);
  const chosen = (state.draft?.entries ?? []).filter(
    (entry) => !state.left.includes(entry.key),
  ).length;
  const error = state.error ? (
    <Alert variant="error" className="mt-4">
      {state.error}
    </Alert>
  ) : null;

  const dialogs = gate.dialogs;

  if (state.step === "pick" && state.profile) {
    const { profile } = state;
    const found = profile.repos.length + profile.pulls.length;
    return (
      <>
        <Dialog
          open={open}
          onOpenChange={(next) => (next ? onOpenChange(true) : close())}
          size="lg"
          title={words.pick.title}
          description={fmt(words.pick.description, {
            username: profile.username,
            repos: GITHUB_PICK_LIMITS.repos,
            pulls: GITHUB_PICK_LIMITS.pulls,
          })}
          illustration={
            <OttoNote
              size="sm"
              meta={`${format.plural(words.pick.repoCount, profile.repos.length)} · ${format.plural(words.pick.pullCount, profile.pulls.length)}`}
              message={
                found === 0 && !profile.pullsUnavailable
                  ? fmt(words.pick.nothing, { username: profile.username })
                  : words.pick.otto
              }
            />
          }
          footer={
            <>
              <Button variant="ghost" onClick={flow.back}>
                {words.pick.back}
              </Button>
              <Button
                onClick={() => void flow.draft()}
                disabled={count === 0}
                loading={state.busy === "draft"}
              >
                {count > 0 ? format.plural(words.pick.draft, count) : words.pick.draftNone}
              </Button>
            </>
          }
        >
          {state.busy === "draft" ? <OttoWorking task="github" size="sm" className="mb-4" /> : null}
          <PickStep
            profile={profile}
            resume={resume}
            repos={state.repos}
            pulls={state.pulls}
            onToggleRepo={flow.toggleRepo}
            onTogglePull={flow.togglePull}
          />
          {error}
        </Dialog>
        {dialogs}
      </>
    );
  }

  if (state.step === "review" && state.draft) {
    const { draft } = state;
    const lines = draft.entries.reduce((sum, entry) => sum + entry.bullets.length, 0);
    return (
      <>
        <Dialog
          open={open}
          onOpenChange={(next) => (next ? onOpenChange(true) : close())}
          size="lg"
          title={words.review.title}
          description={words.review.description}
          illustration={
            <OttoNote
              size="sm"
              meta={`${format.plural(words.review.projects, draft.entries.length)} · ${format.plural(words.review.lines, lines)}`}
              message={draft.usedAI ? words.review.usedAI : words.review.plain}
            />
          }
          footer={
            <>
              <Button variant="ghost" onClick={flow.back}>
                {words.review.pickOther}
              </Button>
              <Button onClick={add} disabled={chosen === 0}>
                {chosen > 0 ? format.plural(words.review.add, chosen) : words.review.addNone}
              </Button>
            </>
          }
        >
          <ReviewStep draft={draft} resume={resume} left={state.left} onToggle={flow.toggleEntry} />
        </Dialog>
        {dialogs}
      </>
    );
  }

  return (
    <>
      <GitHubStartDialog
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : close())}
        onClose={close}
        github={github}
        target={resume.id}
        lookingUp={state.busy === "lookup"}
        error={state.error}
        onFind={() => void flow.lookup()}
        onDisconnect={() => void disconnect()}
        onSignIn={() => void signIn()}
      />
      {dialogs}
    </>
  );
}
