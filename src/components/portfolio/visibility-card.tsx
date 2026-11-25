"use client";

import { Link2 } from "lucide-react";
import { useShareResume } from "@/components/share/use-share-resume";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Portfolio, PortfolioSection } from "@/lib/portfolio/types";
import type { Resume } from "@/lib/resume/schema";
import { CheckRow, EditorSection } from "./check-row";
import { resumeLinkLine } from "./lines";
import { savePortfolio } from "./portfolio-store";
import type { ResumeLink } from "./use-resume-link";

type VisibilityCardProps = {
  portfolio: Portfolio;
  sections: readonly PortfolioSection[];
  email: string;
  phone: string;
  resumeLink: ResumeLink;
  source: Resume | null;
  disabled: boolean;
};

function ShareAction({ resume, shared }: { resume: Resume; shared: boolean }) {
  const words = useMessages("portfolio").visibility;
  const share = useShareResume(resume);
  return (
    <div>
      {shared ? (
        <Button variant="secondary" size="sm" onClick={share.open}>
          {words.linkSettings}
        </Button>
      ) : (
        <Button variant="secondary" size="sm" onClick={share.share}>
          <Link2 aria-hidden />
          {words.shareResume}
        </Button>
      )}
      {share.dialog}
    </div>
  );
}

export function VisibilityCard({
  portfolio,
  sections,
  email,
  phone,
  resumeLink,
  source,
  disabled,
}: VisibilityCardProps) {
  const words = useMessages("portfolio");
  const v = words.visibility;
  const hidden = new Set(portfolio.hiddenSections);
  function toggle(section: PortfolioSection, show: boolean) {
    const next = new Set(hidden);
    if (show) next.delete(section);
    else next.add(section);
    void savePortfolio({ hiddenSections: [...next] }, words.store);
  }
  const shown = sections.filter((section) => !hidden.has(section)).length;
  return (
    <div className="flex flex-col gap-10">
      {sections.length > 0 ? (
        <EditorSection
          title={v.onPage}
          description={fmt(v.shown, { shown, total: sections.length })}
        >
          <fieldset disabled={disabled} className="min-w-0">
            <legend className="sr-only">{v.legend}</legend>
            <div className="divide-y divide-border border-y border-border">
              {sections.map((section) => (
                <CheckRow
                  key={section}
                  checked={!hidden.has(section)}
                  onChange={(checked) => toggle(section, checked)}
                  label={words.sections[section]}
                  hint={hidden.has(section) ? v.hidden : undefined}
                />
              ))}
            </div>
          </fieldset>
        </EditorSection>
      ) : null}
      <EditorSection title={v.contact} description={v.contactIntro}>
        <fieldset disabled={disabled} className="min-w-0">
          <legend className="sr-only">{v.contact}</legend>
          <div className="divide-y divide-border border-y border-border">
            <CheckRow
              checked={portfolio.showEmail}
              onChange={(checked) => void savePortfolio({ showEmail: checked }, words.store)}
              label={v.showEmail}
              hint={
                !email
                  ? v.noEmail
                  : portfolio.showEmail
                    ? fmt(v.emailOn, { email })
                    : fmt(v.emailOff, { email })
              }
              disabled={!email}
            />
            <CheckRow
              checked={portfolio.showPhone}
              onChange={(checked) => void savePortfolio({ showPhone: checked }, words.store)}
              label={v.showPhone}
              hint={
                !phone
                  ? v.noPhone
                  : portfolio.showPhone
                    ? fmt(v.phoneOn, { phone })
                    : fmt(v.phoneOff, { phone })
              }
              disabled={!phone}
            />
          </div>
        </fieldset>
      </EditorSection>
      <EditorSection title={v.resumeLink} description={resumeLinkLine(words, resumeLink)}>
        {source ? <ShareAction resume={source} shared={resumeLink.shared} /> : null}
      </EditorSection>
    </div>
  );
}
