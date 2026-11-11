"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { api, isApiError } from "@/lib/api/client";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { noteReadByAI, noteReadByRules, rereadableFile } from "../import-notes";

const REREAD_LABEL = "Otto re-read your file";

// What the reader decides. Name, format, design and dates the person may already have changed stay.
function withReadContent(current: Resume, read: Resume): Resume {
  return {
    ...current,
    basics: read.basics,
    summary: read.summary,
    experience: read.experience,
    education: read.education,
    projects: read.projects,
    skills: read.skills,
    certifications: read.certifications,
    extras: read.extras,
    sectionOrder: read.sectionOrder,
  };
}

// Pro and the trial can ask the AI reader for a second look; Free has no AI reads to offer.
export function RereadNote({ resumeId }: { resumeId: string }) {
  const pro = useProTools();
  const updateResume = useStudioStore((s) => s.updateResume);
  const [busy, setBusy] = useState(false);
  const file = rereadableFile(resumeId);
  if (pro !== true || !file) return null;

  async function reread(source: File) {
    setBusy(true);
    try {
      const { resume, usedAI, basicReader } = await api.importFile(source, { reader: "ai" });
      if (usedAI) {
        updateResume(resumeId, (current) => withReadContent(current, resume), {
          label: REREAD_LABEL,
        });
        noteReadByAI(resumeId);
        toast({
          title: REREAD_LABEL,
          description: "Undo puts the first read back.",
          variant: "success",
        });
      } else if (basicReader) {
        // The plan's AI reads ran out since the upload: the note under the checks now says so.
        noteReadByRules(resumeId, true);
      } else {
        toast({
          title: "Otto couldn't re-read it this time",
          description: "Your resume is as it was.",
        });
      }
    } catch (error) {
      toast({
        title: isApiError(error, "rate_limited")
          ? "That's a lot at once"
          : "Otto couldn't re-read it",
        description: "Your resume is as it was. Try again in a minute.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <p className="flex items-start gap-2 text-sm text-muted">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        Sorted in a second, no AI read used. Something in the wrong place?{" "}
        <Button
          variant="link"
          loading={busy}
          onClick={() => void reread(file)}
          className="align-baseline"
        >
          {busy ? "Otto is re-reading it" : "Let Otto re-read it"}
        </Button>
      </span>
    </p>
  );
}
