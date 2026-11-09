"use client";

import {
  PORTFOLIO_SECTION_LABELS,
  type Portfolio,
  type PortfolioSection,
} from "@/lib/portfolio/types";
import { CheckRow, EditorCard } from "./check-row";
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
  return (
    <EditorCard title="What shows">
      <fieldset disabled={disabled} className="min-w-0">
        <legend className="sr-only">Contact details</legend>
        <div className="divide-y divide-border border-y border-border">
          <CheckRow
            checked={portfolio.showEmail}
            onChange={(checked) => void savePortfolio({ showEmail: checked })}
            label="Show my email"
            hint={email ? `Off: ${email} stays off the page.` : "Your resume has no email."}
            disabled={!email}
          />
          <CheckRow
            checked={portfolio.showPhone}
            onChange={(checked) => void savePortfolio({ showPhone: checked })}
            label="Show my phone"
            hint={phone ? `Off: ${phone} stays off the page.` : "Your resume has no phone number."}
            disabled={!phone}
          />
        </div>
      </fieldset>
      {sections.length > 0 ? (
        <fieldset disabled={disabled} className="mt-4 min-w-0">
          <legend className="text-sm/6 font-medium text-ink">Sections</legend>
          <div className="mt-1 grid grid-cols-2 gap-x-4">
            {sections.map((section) => (
              <CheckRow
                key={section}
                checked={!hidden.has(section)}
                onChange={(checked) => toggle(section, checked)}
                label={PORTFOLIO_SECTION_LABELS[section]}
              />
            ))}
          </div>
        </fieldset>
      ) : null}
    </EditorCard>
  );
}
