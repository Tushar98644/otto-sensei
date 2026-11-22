"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FolderCard } from "@/components/ui/folder-card";
import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import { ProMark } from "@/components/ui/pro-mark";
import { withWordsOnly } from "@/lib/career-log/entry";
import type { CareerLogEntry } from "@/lib/career-log/types";
import { NotebookArt } from "./log-art";

const dialog = lazyComponent(() => import("./lines-dialog").then((m) => m.LinesDialog));

export function LinesFolder({ entries }: { entries: readonly CareerLogEntry[] }) {
  const pro = useProTools();
  const [open, setOpen] = useState(false);
  const opened = useOpenedOnce(open);
  const written = withWordsOnly(entries);

  function start() {
    if (pro === false) {
      openFeaturePrompt("draft");
      return;
    }
    setOpen(true);
  }

  return (
    <FolderCard tab="For your next search" bodyClassName="flex flex-col gap-2 p-2">
      <NotebookArt label="Lines" pose="think" className="h-36" delay={-4.4} />
      <div className="flex flex-1 flex-col items-start gap-4 px-2 pt-2 pb-3 sm:px-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Eyebrow>
              {written.length > 0
                ? `${written.length} ${written.length === 1 ? "month" : "months"} of notes`
                : "Your notes, your words"}
            </Eyebrow>
            {pro === false ? <ProMark /> : null}
          </div>
          <p className="font-display text-2xl/8 font-normal tracking-tight text-pretty text-ink">
            Turn your log into resume lines
          </p>
          <p className="text-sm/6 text-pretty text-muted">
            Pick a job and the months. Otto writes lines that quote your own facts and leaves a
            blank for any number it doesn&apos;t have. You accept each one in the studio.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={start}
          disabled={written.length === 0}
          className="max-sm:w-full"
        >
          <Sparkles aria-hidden />
          Turn my log into resume lines
        </Button>
        {written.length === 0 ? (
          <p className="text-sm/6 text-subtle">Write a month first, then come back.</p>
        ) : null}
      </div>
      {opened ? (
        <Lazy
          loader={dialog}
          wanted
          props={{ open, onClose: () => setOpen(false), entries: written }}
        />
      ) : null}
    </FolderCard>
  );
}
