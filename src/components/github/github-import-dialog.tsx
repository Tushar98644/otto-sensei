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
import { pluralize } from "@/lib/utils";
import { GitHubStartDialog } from "./connect-step";
import { GITHUB_OTTO } from "./format";
import { PickStep } from "./pick-step";
import { ReviewStep } from "./review-step";
import { useGitHubConnection } from "./use-github-connection";
import { useGitHubImport, type GitHubImport } from "./use-github-import";

export type GitHubImportDialogProps = {
  resume: Resume;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // After "Add" changed the resume, with the resume as it is now (the portfolio pushes it to a page
  // that isn't kept in sync).
  onAdded?: (resume: Resume) => void;
};

const EDIT_LABEL = "Added projects from GitHub";

// Drafts already listed on the resume start unticked, so importing twice doesn't double them.
function alreadyOnFor(resume: Resume) {
  return (draft: GitHubDraftResult) =>
    draft.entries.filter((entry) => isOnResume(resume, entry)).map((entry) => entry.key);
}

// Projects the picked items turn into: one per repo, one per repo the pull requests went to.
function projectCount(flow: GitHubImport): number {
  const { profile, repos, pulls } = flow.state;
  const pullRepos = new Set(
    (profile?.pulls ?? []).filter((pull) => pulls.includes(pull.id)).map((pull) => pull.repo),
  );
  return repos.length + pullRepos.size;
}

/**
 * "Import from GitHub": the connected GitHub account (connected first when there is none, looked
 * up the moment the dialog opens) → the best public work picked and drafted by itself → the
 * person keeps what they want, and only "Add" changes the resume. "Pick other repos" opens the
 * full list of repos and merged pull requests.
 */
export function GitHubImportDialog({
  resume,
  open,
  onOpenChange,
  onAdded,
}: GitHubImportDialogProps) {
  const gate = useAccountGate();
  const github = useGitHubConnection(open);
  const flow = useGitHubImport(resume, github.login, alreadyOnFor(resume), (error) => {
    // Disconnected since the dialog opened (another tab): the first screen offers "Connect
    // GitHub" again.
    if (isApiError(error, "github_not_connected")) github.reload();
    else gate.handleApiError(error, "github");
  });
  const updateResume = useStudioStore((s) => s.updateResume);
  const { state } = flow;
  // Once per opening, so going back to the first screen doesn't look the account up again.
  const autoStarted = useRef(false);
  const login = github.login;
  const startLookup = useEffectEvent(() => void flow.lookup());

  useEffect(() => {
    if (!open || autoStarted.current || !login) return;
    autoStarted.current = true;
    // After this render, so the dialog is on screen before its state moves on.
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
    if (await gate.requireUser("Sign in to connect your GitHub account.")) github.reload();
  }

  function add() {
    const chosen = (state.draft?.entries ?? []).filter((entry) => !state.left.includes(entry.key));
    if (chosen.length === 0) return;
    const { added, skipped } = addGitHubProjects(resume, chosen);
    if (added > 0) {
      updateResume(resume.id, (current) => addGitHubProjects(current, chosen).resume, { label: EDIT_LABEL });
      const latest = useStudioStore.getState().resumes[resume.id];
      if (latest) onAdded?.(latest);
    }
    toast(
      added > 0
        ? {
            title: `Added ${pluralize(added, "project")} from GitHub`,
            description:
              skipped > 0
                ? `A resume holds ${MAX_PROJECTS} projects, so ${skipped} didn't fit.`
                : "They're under Projects. Edit any line to make it yours.",
            variant: "success",
          }
        : { title: `This resume already has ${MAX_PROJECTS} projects`, description: "Remove one to make room.", variant: "error" },
    );
    close();
  }

  const count = projectCount(flow);
  const chosen = (state.draft?.entries ?? []).filter((entry) => !state.left.includes(entry.key)).length;
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
          title="Pick what to add"
          description={`Public work by ${profile.username}. Up to ${GITHUB_PICK_LIMITS.repos} repos and ${GITHUB_PICK_LIMITS.pulls} pull requests.`}
          illustration={
            <OttoNote
              size="sm"
              meta={`${pluralize(profile.repos.length, "repo")} · ${pluralize(profile.pulls.length, "pull request")}`}
              message={
                found === 0 && !profile.pullsUnavailable
                  ? GITHUB_OTTO.nothing(profile.username)
                  : GITHUB_OTTO.pick
              }
            />
          }
          footer={
            <>
              <Button variant="ghost" onClick={flow.back}>
                Back
              </Button>
              <Button onClick={() => void flow.draft()} disabled={count === 0} loading={state.busy === "draft"}>
                {count > 0 ? `Draft ${pluralize(count, "project")}` : "Draft projects"}
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
          title="Keep the projects you want"
          description="Otto picked your best public work. Untick anything you don't want; nothing is added until you say so."
          illustration={
            <OttoNote
              size="sm"
              meta={`${pluralize(draft.entries.length, "project")} · ${pluralize(lines, "line")}`}
              message={
                draft.usedAI ? GITHUB_OTTO.reviewAI : GITHUB_OTTO.reviewPlain
              }
            />
          }
          footer={
            <>
              <Button variant="ghost" onClick={flow.back}>
                Pick other repos
              </Button>
              <Button onClick={add} disabled={chosen === 0}>
                {chosen > 0 ? `Add ${pluralize(chosen, "project")}` : "Add projects"}
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
