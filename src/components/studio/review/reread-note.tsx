"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useMessages } from "@/i18n/client";
import { api, isApiError } from "@/lib/api/client";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { noteReadByAI, noteReadByRules, rereadableFile } from "../import-notes";

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

export function RereadNote({ resumeId }: { resumeId: string }) {
  const pro = useProTools();
  const updateResume = useStudioStore((s) => s.updateResume);
  const [busy, setBusy] = useState(false);
  const t = useMessages("studio").reread;
  const file = rereadableFile(resumeId);
  if (pro !== true || !file) return null;

  async function reread(source: File) {
    setBusy(true);
    try {
      const { resume, usedAI, basicReader } = await api.importFile(source, { reader: "ai" });
      if (usedAI) {
        updateResume(resumeId, (current) => withReadContent(current, resume), {
          label: t.done,
        });
        noteReadByAI(resumeId);
        toast({
          title: t.done,
          description: t.undoNote,
          variant: "success",
        });
      } else if (basicReader) {
        noteReadByRules(resumeId, true);
      } else {
        toast({ title: t.notThisTime, description: t.unchanged });
      }
    } catch (error) {
      toast({
        title: isApiError(error, "rate_limited") ? t.tooMany : t.failed,
        description: t.failedNote,
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
        {t.sorted}{" "}
        <Button
          variant="link"
          loading={busy}
          onClick={() => void reread(file)}
          className="align-baseline"
        >
          {busy ? t.busy : t.action}
        </Button>
      </span>
    </p>
  );
}
