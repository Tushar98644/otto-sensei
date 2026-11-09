"use client";

import Link from "next/link";
import { useId } from "react";
import { upgradeHref } from "@/components/site/routes";
import { resumeLabel, tailoredLabel } from "@/components/studio/resume-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { PlanId } from "@/config/plans";
import { canHideCredit } from "@/lib/portfolio/plan";
import type { Portfolio } from "@/lib/portfolio/types";
import type { Resume } from "@/lib/resume/schema";
import { CheckRow, EditorCard } from "./check-row";
import { savePortfolio } from "./portfolio-store";

type SettingsCardProps = {
  portfolio: Portfolio;
  resumes: readonly Resume[];
  // The resume the page is made from, when it's in this browser.
  source: Resume | null;
  // The page's copy is older than the resume.
  behind: boolean;
  plan: PlanId;
  disabled: boolean;
};

export function SettingsCard({
  portfolio,
  resumes,
  source,
  behind,
  plan,
  disabled,
}: SettingsCardProps) {
  const selectId = useId();
  const paid = canHideCredit(plan);
  return (
    <EditorCard title="Settings">
      <div className="flex flex-col gap-2">
        <Label htmlFor={selectId}>Made from</Label>
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
      <fieldset disabled={disabled} className="mt-3 min-w-0">
        <legend className="sr-only">Page settings</legend>
        <div className="divide-y divide-border border-y border-border">
          <CheckRow
            checked={portfolio.sync}
            onChange={(checked) => void savePortfolio({ sync: checked })}
            label="Keep in sync with my resume"
            hint="On: edits to the resume show on the page by themselves."
          />
          <CheckRow
            checked={portfolio.allowIndexing}
            onChange={(checked) => void savePortfolio({ allowIndexing: checked })}
            label="Let search engines find it"
            hint="Off: Google and others are asked to keep it out of search results."
          />
          <CheckRow
            checked={paid && portfolio.hideCredit}
            onChange={(checked) => void savePortfolio({ hideCredit: checked })}
            disabled={!paid}
            label={
              <span className="inline-flex items-center gap-2">
                Hide “Made with Otto Sensei”
                {paid ? null : <Badge variant="ink">Pro</Badge>}
              </span>
            }
            hint={
              paid ? (
                "The small line at the bottom of the page."
              ) : (
                <>
                  Comes with Pro and Max.{" "}
                  <Link
                    href={upgradeHref("pro")}
                    className="font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
                  >
                    See Pro
                  </Link>
                </>
              )
            }
          />
        </div>
      </fieldset>
      {!portfolio.sync && behind && source ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          disabled={disabled}
          onClick={() => void savePortfolio({ resume: source })}
        >
          Update the page to my latest resume
        </Button>
      ) : null}
    </EditorCard>
  );
}
