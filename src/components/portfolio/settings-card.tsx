"use client";

import { useId } from "react";
import { resumeLabel, tailoredLabel } from "@/components/studio/resume-label";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Portfolio } from "@/lib/portfolio/types";
import type { Resume } from "@/lib/resume/schema";
import { AddressCard } from "./address-card";
import { CheckRow, EditorSection } from "./check-row";
import { DeletePortfolio } from "./content/content-editor";
import { viewsLabel } from "./lines";
import { savePortfolio } from "./portfolio-store";

type SettingsCardProps = {
  portfolio: Portfolio;
  resumes: readonly Resume[];
  // The resume the page is made from, when it's in this browser.
  source: Resume | null;
  // The page's copy is older than the resume.
  behind: boolean;
  disabled: boolean;
};

export function SettingsCard({ portfolio, resumes, source, behind, disabled }: SettingsCardProps) {
  const selectId = useId();
  return (
    <div className="flex flex-col gap-10">
      <AddressCard portfolio={portfolio} />
      <EditorSection title="Made from">
        <div className="flex flex-col gap-2">
          <Label htmlFor={selectId}>Resume</Label>
          <Select
            id={selectId}
            value={source ? source.id : ""}
            disabled={disabled}
            onChange={(event) => {
              const next = resumes.find((resume) => resume.id === event.currentTarget.value);
              if (next) void savePortfolio({ resume: next });
            }}
          >
            {source ? null : <option value="">A resume that isn&apos;t in this browser</option>}
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {[resumeLabel(resume), tailoredLabel(resume)].filter(Boolean).join(" · ")}
              </option>
            ))}
          </Select>
        </div>
        <fieldset disabled={disabled} className="min-w-0">
          <legend className="sr-only">Keeping the page up to date</legend>
          <div className="border-y border-border">
            <CheckRow
              checked={portfolio.sync}
              onChange={(checked) => void savePortfolio({ sync: checked })}
              label="Keep in sync with my resume"
              hint="On: edits to the resume show on the page by themselves."
            />
          </div>
        </fieldset>
        {!portfolio.sync && behind && source ? (
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            disabled={disabled}
            onClick={() => void savePortfolio({ resume: source })}
          >
            Update the page to my latest resume
          </Button>
        ) : null}
      </EditorSection>
      <EditorSection title="Search engines">
        <fieldset disabled={disabled} className="min-w-0">
          <legend className="sr-only">Search engines</legend>
          <div className="border-y border-border">
            <CheckRow
              checked={portfolio.allowIndexing}
              onChange={(checked) => void savePortfolio({ allowIndexing: checked })}
              label="Let search engines find it"
              hint="Off: Google and others are asked to keep it out of search results."
            />
          </div>
        </fieldset>
      </EditorSection>
      <EditorSection
        title="Views"
        description={`${viewsLabel(portfolio.views)}. Counts leave out you, link previews and search engines.`}
      />
      <div className="border-t border-border pt-6">
        <DeletePortfolio />
      </div>
    </div>
  );
}
