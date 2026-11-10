"use client";

import { useEffect, useEffectEvent, useId, useRef, type FormEvent } from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { addGitHubProjects, isOnResume, MAX_PROJECTS } from "@/lib/github/to-projects";
import { GITHUB_PICK_LIMITS, type GitHubDraftResult } from "@/lib/github/types";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { pluralize } from "@/lib/utils";
import { GITHUB_OTTO, usernameFromResume } from "./format";
import { PickStep } from "./pick-step";
import { ReviewStep } from "./review-step";
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
 * "Import from GitHub": a GitHub username (read from the resume's links when it has one, and
 * looked up the moment the dialog opens) → the best public work picked and drafted by itself →
 * the person keeps what they want, and only "Add" changes the resume. "Pick other repos" opens
 * the full list of repos and merged pull requests.
 */
export function GitHubImportDialog({
  resume,
  open,
  onOpenChange,
  onAdded,
}: GitHubImportDialogProps) {
  const gate = useAccountGate();
  const flow = useGitHubImport(resume, alreadyOnFor(resume), (error) =>
    gate.handleApiError(error, "github"),
  );
  const updateResume = useStudioStore((s) => s.updateResume);
  const formId = useId();
  const { state } = flow;
  // Once per opening, so going back to the name step lets the person type another one.
  const autoStarted = useRef(false);
  const knownName = usernameFromResume(resume) !== "";
  const startLookup = useEffectEvent(() => void flow.lookup());

  useEffect(() => {
    if (!open || autoStarted.current || !knownName) return;
    autoStarted.current = true;
    // After this render, so the dialog is on screen before its state moves on.
    const timer = window.setTimeout(startLookup, 0);
    return () => window.clearTimeout(timer);
  }, [open, knownName]);

  function close() {
    flow.reset();
    autoStarted.current = false;
    onOpenChange(false);
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

  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void flow.lookup();
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
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : close())}
        size="sm"
        title="Import from GitHub"
        description="Pick public repos and merged pull requests, and Otto drafts project lines from them. No GitHub sign-in needed."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form={formId} loading={state.busy === "lookup"}>
              Find my work
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={submitName} noValidate>
          <Field
            label="GitHub username"
            hint="Your profile link works too, like github.com/octocat."
            error={state.error}
          >
            <Input
              value={flow.username}
              onChange={(event) => flow.setUsername(event.target.value)}
              placeholder="octocat"
              maxLength={200}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              data-autofocus
            />
          </Field>
          {state.busy === "lookup" ? (
            <OttoWorking task="githubLookup" size="sm" className="mt-4" />
          ) : null}
        </form>
      </Dialog>
      {dialogs}
    </>
  );
}
