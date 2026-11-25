"use client";

import { useId } from "react";
import { resumeLabel, tailoredLabel } from "@/components/studio/resume-label";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
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
  source: Resume | null;
  behind: boolean;
  disabled: boolean;
};

export function SettingsCard({ portfolio, resumes, source, behind, disabled }: SettingsCardProps) {
  const words = useMessages("portfolio");
  const format = useFormat();
  const set = words.settings;
  const selectId = useId();
  return (
    <div className="flex flex-col gap-10">
      <AddressCard portfolio={portfolio} />
      <EditorSection title={set.madeFrom}>
        <div className="flex flex-col gap-2">
          <Label htmlFor={selectId}>{set.resume}</Label>
          <Select
            id={selectId}
            value={source ? source.id : ""}
            disabled={disabled}
            onChange={(event) => {
              const next = resumes.find((resume) => resume.id === event.currentTarget.value);
              if (next) void savePortfolio({ resume: next }, words.store);
            }}
          >
            {source ? null : <option value="">{set.notHere}</option>}
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {[resumeLabel(resume), tailoredLabel(resume)].filter(Boolean).join(" · ")}
              </option>
            ))}
          </Select>
        </div>
        <fieldset disabled={disabled} className="min-w-0">
          <legend className="sr-only">{set.upToDate}</legend>
          <div className="border-y border-border">
            <CheckRow
              checked={portfolio.sync}
              onChange={(checked) => void savePortfolio({ sync: checked }, words.store)}
              label={set.sync}
              hint={set.syncHint}
            />
          </div>
        </fieldset>
        {!portfolio.sync && behind && source ? (
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            disabled={disabled}
            onClick={() => void savePortfolio({ resume: source }, words.store)}
          >
            {set.update}
          </Button>
        ) : null}
      </EditorSection>
      <EditorSection title={set.search}>
        <fieldset disabled={disabled} className="min-w-0">
          <legend className="sr-only">{set.search}</legend>
          <div className="border-y border-border">
            <CheckRow
              checked={portfolio.allowIndexing}
              onChange={(checked) => void savePortfolio({ allowIndexing: checked }, words.store)}
              label={set.indexing}
              hint={set.indexingHint}
            />
          </div>
        </fieldset>
      </EditorSection>
      <EditorSection
        title={set.views}
        description={fmt(set.viewsNote, { views: viewsLabel(words, format, portfolio.views) })}
      />
      <div className="border-t border-border pt-6">
        <DeletePortfolio />
      </div>
    </div>
  );
}
