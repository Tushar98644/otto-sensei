"use client";

import {
  Check,
  CloudAlert,
  CloudCheck,
  CloudOff,
  CloudUpload,
  Save,
  TriangleExclamationPoint,
  type LucideIcon,
} from "lucide-react";
import { useMe } from "@/components/account/use-me";
import { Button } from "@/components/ui/button";
import { useLocalSave, useStudioStore } from "@/lib/store/resume-store";
import { flushCloudSync, useBackup } from "@/lib/sync/use-cloud-sync";
import { Popover, usePopover } from "./popover";
import {
  isSaveProblem,
  SAVE_COPY,
  saveState,
  type SaveProblem,
  type SaveState,
} from "./save-state";

const ICONS: Record<SaveState, LucideIcon> = {
  saving: CloudUpload,
  saved: CloudCheck,
  device: Check,
  local: CloudOff,
  retrying: CloudAlert,
  unsaved: TriangleExclamationPoint,
};

export function SaveStatus({ resumeId }: { resumeId: string | null }) {
  const { user, loading } = useMe();
  const local = useLocalSave();
  const backup = useBackup(resumeId);
  if (!resumeId || loading) return null;

  const state = saveState(local, backup, user !== null);
  const { label, detail } = SAVE_COPY[state];
  // Signed out, nothing goes to the cloud.
  const Icon = state === "saving" && !user ? Save : ICONS[state];
  const problem = isSaveProblem(state);

  return (
    <>
      {problem ? (
        <Popover
          label="Save status"
          align="end"
          triggerClassName="relative flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-warn-soft px-2 text-sm font-medium whitespace-nowrap text-warn-ink transition-shadow after:absolute after:-inset-1.5 hover:ring-1 hover:ring-ink/20 aria-expanded:ring-1 aria-expanded:ring-ink/30 md:px-2.5"
          trigger={
            <>
              <Icon aria-hidden className="size-4 text-warn" />
              <span className="max-md:sr-only">{label}</span>
            </>
          }
          className="p-3"
        >
          <ProblemPanel state={state} />
        </Popover>
      ) : (
        <p
          title={detail}
          className="flex shrink-0 items-center gap-1.5 text-sm whitespace-nowrap text-subtle"
        >
          <Icon aria-hidden className="size-4" />
          <span className="max-md:sr-only">{label}</span>
        </p>
      )}
      <span role="status" className="sr-only">
        {problem ? `${label}. ${detail}` : ""}
      </span>
    </>
  );
}

function ProblemPanel({ state }: { state: SaveProblem }) {
  const { close } = usePopover();
  const setStep = useStudioStore((s) => s.setStep);

  function act() {
    if (state === "retrying") void flushCloudSync();
    else setStep("download");
    close();
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm/6 text-pretty text-ink">{SAVE_COPY[state].detail}</p>
      <Button variant="secondary" size="sm" onClick={act}>
        {state === "retrying" ? "Try again now" : "Go to Download"}
      </Button>
    </div>
  );
}
