"use client";

import { Globe } from "lucide-react";
import { useId, useState } from "react";
import { NewResumeMenu } from "@/components/dashboard/new-resume-menu";
import { useStudioActions } from "@/components/dashboard/use-studio-actions";
import { Otto } from "@/components/mascot/otto";
import { resumeLabel, tailoredLabel } from "@/components/studio/resume-label";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Resume } from "@/lib/resume/schema";
import { PORTFOLIO_LINES } from "./lines";
import { makePortfolio, usePortfolioStore } from "./portfolio-store";

// Before there is a portfolio: the screen's one full-body Otto, a resume picker and one button.
export function PortfolioStart({ candidates }: { candidates: readonly Resume[] }) {
  const selectId = useId();
  const actions = useStudioActions();
  const saving = usePortfolioStore((state) => state.saving);
  const [picked, setPicked] = useState<string | null>(null);
  const resume = candidates.find((item) => item.id === picked) ?? candidates[0] ?? null;

  return (
    <section className="flex flex-col items-center rounded-3xl bg-surface px-6 py-12 text-center sm:py-16">
      <Otto pose="wave" size={128} title="Otto the otter, waving" className="size-28 sm:size-32" />
      <h2 className="mt-6 font-sans text-lg/7 font-medium text-ink">Your resume, as a web page</h2>
      <p className="mt-2 max-w-md text-sm/6 text-pretty text-muted">
        {resume ? PORTFOLIO_LINES.start : PORTFOLIO_LINES.noResumes} All eight designs come with Pro
        and Max.
      </p>
      {resume ? (
        <div className="mt-6 flex w-full max-w-sm flex-col gap-3 text-left">
          {candidates.length > 1 ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor={selectId}>Make it from</Label>
              <Select
                id={selectId}
                value={resume.id}
                onChange={(event) => setPicked(event.currentTarget.value)}
              >
                {candidates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {[resumeLabel(item), tailoredLabel(item)].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <Button size="lg" loading={saving} onClick={() => void makePortfolio(resume)}>
            <Globe aria-hidden />
            Make my portfolio
          </Button>
          <p className="text-center text-sm/5 text-subtle">Nothing goes live until you publish.</p>
        </div>
      ) : (
        <div className="mt-6">
          <NewResumeMenu actions={actions} />
        </div>
      )}
    </section>
  );
}
