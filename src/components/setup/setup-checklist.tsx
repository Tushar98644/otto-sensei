"use client";

import { ArrowRight, Circle, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { useWorkProfile } from "@/components/eligibility/use-work-profile";
import { openLineOnArrival } from "@/components/studio/tailor/jump";
import { Button } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { Progress } from "@/components/ui/progress";
import { undoToast } from "@/components/ui/undo-toast";
import {
  checklistShows,
  ownResumes,
  setupItems,
  setupProgress,
  type SetupItemId,
} from "@/lib/setup/checklist";
import { weakLineState, type WeakLineState } from "@/lib/setup/weak-line";
import { useResumeList } from "@/lib/store/resume-store";
import { useFirstLoadPending } from "@/lib/sync/use-cloud-sync";
import { cn } from "@/lib/utils";
import type { StudioActions } from "../dashboard/use-studio-actions";
import { accountSectionHref } from "./links";
import { rememberWeakLine, setChecklistHidden, useAccountSetup } from "./use-account-setup";
import { useReminderChoice } from "./use-reminder-choice";

type Copy = { todo: string; done: string; help: string };

const COPY: Record<SetupItemId, Copy> = {
  resume: {
    todo: "Add your resume",
    done: "Resume added",
    help: "Upload a file or start from scratch. Otto shows what hiring software reads.",
  },
  work: {
    todo: "Where you can work",
    done: "Where you can work",
    help: "Your country and visa needs, so Jobs can flag posts that can't hire you.",
  },
  looking_for: {
    todo: "What you're looking for",
    done: "What you're looking for",
    help: "Role, level and place. Jobs puts the closest matches first.",
  },
  weak_line: {
    todo: "Fix your first weak line",
    done: "First weak line fixed",
    help: "Otto marks lines that need work. Start with the first one.",
  },
  reminders: {
    todo: "Follow-up reminders",
    done: "Follow-up reminders",
    help: "Choose whether Otto also emails you when it's time to follow up.",
  },
};

const WEAK_LINE_WAITING: Partial<Record<WeakLineState["status"], string>> = {
  no_resume: "Add a resume first, then Otto marks the lines that need work.",
  no_lines: "Add your jobs and what you did in them, then Otto marks the weak lines.",
};

export function SetupChecklist({ actions }: { actions: StudioActions }) {
  const pro = useProTools();
  const work = useWorkProfile();
  const setup = useAccountSetup();
  const resumes = useResumeList();
  const loadingResumes = useFirstLoadPending();
  const own = useMemo(() => ownResumes(resumes), [resumes]);
  const userId = "userId" in setup ? setup.userId : null;
  const reminders = useReminderChoice(userId, pro === true);
  const remembered = "weakLine" in setup ? setup.weakLine : null;
  const weakLine = useMemo(() => weakLineState(own, remembered), [own, remembered]);

  const settled =
    userId !== null &&
    pro !== null &&
    !loadingResumes &&
    (work.status === "ready" || work.status === "error") &&
    (setup.status === "ready" || setup.status === "error") &&
    reminders.status !== "loading";
  if (!settled || !userId) return null;

  const items = setupItems({
    pro,
    ownResumes: own.length,
    work: work.status === "ready" ? { profile: work.profile, lookingFor: work.lookingFor } : null,
    weakLine,
    reminders: reminders.value,
  });
  const hiddenAt = "checklistHiddenAt" in setup ? setup.checklistHiddenAt : null;
  if (!checklistShows(items, hiddenAt)) return null;
  const progress = setupProgress(items);

  function hide() {
    if (!userId) return;
    void setChecklistHidden(userId, true);
    undoToast({
      title: "Setup list hidden",
      description: "Every setting stays on the Account page.",
      onUndo: () => void setChecklistHidden(userId, false),
    });
  }

  function openWeakLine() {
    if (weakLine.status === "open" && userId) {
      rememberWeakLine(userId, weakLine.target);
      openLineOnArrival(weakLine.target.bulletId);
      actions.open(weakLine.target.resumeId, "fix");
    } else if (weakLine.status === "no_lines" && own[0]) {
      actions.open(own[0].id, "fix");
    } else {
      actions.upload();
    }
  }

  return (
    <section aria-labelledby="setup-heading" data-tour="dashboard-setup">
      <h2 id="setup-heading" className="sr-only">
        Get set up
      </h2>
      <FolderCard
        tab="Get set up"
        tone="lavender"
        tabEnd={
          <Button variant="ghost" size="sm" onClick={hide}>
            Hide this
          </Button>
        }
        bodyClassName="flex flex-col gap-4 px-4 pt-5 pb-2 sm:px-6"
      >
        <Progress
          label="Your setup"
          value={progress.done}
          max={progress.total}
          valueText={`${progress.done} of ${progress.total} done`}
        />
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const copy = COPY[item.id];
            const waiting = item.id === "weak_line" ? WEAK_LINE_WAITING[weakLine.status] : undefined;
            const row = (
              <Row done={item.done} title={item.done ? copy.done : copy.todo}>
                {item.done ? null : (waiting ?? copy.help)}
              </Row>
            );
            const href =
              item.id === "work"
                ? accountSectionHref("work")
                : item.id === "looking_for"
                  ? accountSectionHref("lookingFor")
                  : item.id === "reminders"
                    ? accountSectionHref("reminders")
                    : null;
            return (
              <li key={item.id}>
                {href ? (
                  <Link href={href} className={ROW}>
                    {row}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={ROW}
                    onClick={item.id === "resume" ? actions.upload : openWeakLine}
                  >
                    {row}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </FolderCard>
    </section>
  );
}

const ROW =
  "group/row -mx-2 flex min-h-14 w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors -outline-offset-2 hover:bg-ink/4";

function Row({ done, title, children }: { done: boolean; title: string; children: ReactNode }) {
  return (
    <>
      {done ? (
        <CircleCheck aria-hidden className="size-5 shrink-0 text-pass" />
      ) : (
        <Circle aria-hidden className="size-5 shrink-0 text-border-strong" />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("text-sm/6 font-medium", done ? "text-muted" : "text-ink")}>
          {title}
        </span>
        {children ? <span className="text-sm/5 text-pretty text-muted">{children}</span> : null}
      </span>
      {done ? (
        <span className="shrink-0 text-xs/5 text-subtle">Done</span>
      ) : (
        <ArrowRight
          aria-hidden
          className="size-4 shrink-0 text-muted transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-ink"
        />
      )}
    </>
  );
}
