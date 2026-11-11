"use client";

import {
  PORTFOLIO_SECTION_LABELS,
  type Portfolio,
  type PortfolioSection,
} from "@/lib/portfolio/types";
import { CheckRow, EditorSection } from "./check-row";
import { savePortfolio } from "./portfolio-store";

type VisibilityCardProps = {
  portfolio: Portfolio;
  // Sections the resume has something for; empty ones aren't offered.
  sections: readonly PortfolioSection[];
  // The resume's own email and phone, so the switches can say what they'd show.
  email: string;
  phone: string;
  disabled: boolean;
};

// Hiding a section only changes the page; the Content tab keeps its fields and marks them hidden.
export function VisibilityCard({
  portfolio,
  sections,
  email,
  phone,
  disabled,
}: VisibilityCardProps) {
  const hidden = new Set(portfolio.hiddenSections);
  function toggle(section: PortfolioSection, show: boolean) {
    const next = new Set(hidden);
    if (show) next.delete(section);
    else next.add(section);
    void savePortfolio({ hiddenSections: [...next] });
  }
  const shown = sections.filter((section) => !hidden.has(section)).length;
  return (
    <div className="flex flex-col gap-10">
      {sections.length > 0 ? (
        <EditorSection
          title="On your page"
          description={`${shown} of ${sections.length} shown. A hidden section keeps what's in it, ready to turn back on.`}
        >
          <fieldset disabled={disabled} className="min-w-0">
            <legend className="sr-only">Sections on your page</legend>
            <div className="divide-y divide-border border-y border-border">
              {sections.map((section) => (
                <CheckRow
                  key={section}
                  checked={!hidden.has(section)}
                  onChange={(checked) => toggle(section, checked)}
                  label={PORTFOLIO_SECTION_LABELS[section]}
                  hint={hidden.has(section) ? "Hidden on your page" : undefined}
                />
              ))}
            </div>
          </fieldset>
        </EditorSection>
      ) : null}
      <EditorSection
        title="Contact details"
        description="Both start off, so a public page never hands them out unasked."
      >
        <fieldset disabled={disabled} className="min-w-0">
          <legend className="sr-only">Contact details</legend>
          <div className="divide-y divide-border border-y border-border">
            <CheckRow
              checked={portfolio.showEmail}
              onChange={(checked) => void savePortfolio({ showEmail: checked })}
              label="Show my email"
              hint={
                !email
                  ? "Your resume has no email."
                  : portfolio.showEmail
                    ? `On: visitors see ${email}.`
                    : `Off: ${email} stays off the page.`
              }
              disabled={!email}
            />
            <CheckRow
              checked={portfolio.showPhone}
              onChange={(checked) => void savePortfolio({ showPhone: checked })}
              label="Show my phone"
              hint={
                !phone
                  ? "Your resume has no phone number."
                  : portfolio.showPhone
                    ? `On: visitors see ${phone}.`
                    : `Off: ${phone} stays off the page.`
              }
              disabled={!phone}
            />
          </div>
        </fieldset>
      </EditorSection>
    </div>
  );
}
