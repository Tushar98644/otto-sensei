"use client";

import { useEffect, useMemo, useRef } from "react";
import { useMe } from "@/components/account/use-me";
import { OttoNote } from "@/components/mascot/otto-note";
import { resumeLabel } from "@/components/studio/resume-label";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { showsCredit } from "@/lib/portfolio/plan";
import type { Portfolio } from "@/lib/portfolio/types";
import { sectionsWithContent } from "@/lib/portfolio/view";
import type { Resume } from "@/lib/resume/schema";
import { AddressCard } from "./address-card";
import { ContentEditor } from "./content/content-editor";
import { usePortfolioContent } from "./content/use-content";
import { PORTFOLIO_LINES, portfolioFacts } from "./lines";
import { PortfolioPreview } from "./portfolio-preview";
import { savePortfolio, usePortfolioStore } from "./portfolio-store";
import { PublishCard } from "./publish-card";
import { SettingsCard } from "./settings-card";
import { TemplatePicker } from "./template-picker";
import { VisibilityCard } from "./visibility-card";

type PortfolioEditorProps = {
  portfolio: Portfolio;
  resumes: readonly Resume[];
  // A resume card asked for a portfolio while one already exists from another resume.
  offer: Resume | null;
  onOfferDone: () => void;
};

// Settings on the left, the live page on the right. Every change saves at once.
export function PortfolioEditor({ portfolio, resumes, offer, onOfferDone }: PortfolioEditorProps) {
  const { user } = useMe();
  const saving = usePortfolioStore((state) => state.saving);
  const source = resumes.find((resume) => resume.id === portfolio.resumeId) ?? null;
  const behind = source !== null && source.updatedAt > portfolio.versionAt;
  // In sync, the page is about to take this browser's copy; else it keeps the one it has.
  const shown = portfolio.sync && source ? source : portfolio.snapshot;
  // The page as readers get it (the preview) and, for the content editor, everything the owner
  // has: hiding a section only changes the page.
  const rich = usePortfolioContent(portfolio, shown);
  const view = rich.page.view;
  const sections = useMemo(() => sectionsWithContent(shown), [shown]);
  const plan = user?.plan ?? "free";

  // Cloud backups already carry edits to a synced page; this covers edits that haven't been
  // backed up yet when the owner opens this screen. Once per version.
  const pushed = useRef<number | null>(null);
  useEffect(() => {
    if (!portfolio.sync || !source || !behind || saving) return;
    if (pushed.current === source.updatedAt) return;
    pushed.current = source.updatedAt;
    void savePortfolio({ resume: source });
  }, [portfolio.sync, source, behind, saving]);

  const message = !source
    ? PORTFOLIO_LINES.noResume
    : behind && !portfolio.sync
      ? PORTFOLIO_LINES.behind
      : portfolio.published
        ? PORTFOLIO_LINES.live(portfolio.views)
        : PORTFOLIO_LINES.draft;
  const facts = portfolioFacts({
    projects: view.projects.length,
    jobs: view.experience.length,
    skills: view.skills.reduce((total, group) => total + group.items.length, 0),
  });

  return (
    <div className="flex flex-col gap-6">
      <OttoNote message={message} meta={facts || undefined} />
      {offer ? (
        <Alert
          title={`Show “${resumeLabel(offer)}” instead?`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                loading={saving}
                onClick={async () => {
                  if (await savePortfolio({ resume: offer })) onOfferDone();
                }}
              >
                Use this resume
              </Button>
              <Button size="sm" variant="ghost" onClick={onOfferDone}>
                Keep the current one
              </Button>
            </div>
          }
        >
          You have one portfolio. It now shows{" "}
          {source ? `“${resumeLabel(source)}”` : "another resume"}.
        </Alert>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <PublishCard portfolio={portfolio} />
          <TemplatePicker
            value={portfolio.template}
            onChange={(template) => void savePortfolio({ template })}
          />
          <AddressCard portfolio={portfolio} />
          <VisibilityCard
            portfolio={portfolio}
            sections={sections}
            email={shown.basics.email.trim()}
            phone={shown.basics.phone.trim()}
            disabled={false}
          />
          <SettingsCard
            portfolio={portfolio}
            resumes={resumes}
            source={source}
            behind={behind}
            plan={plan}
            disabled={saving}
          />
          <ContentEditor
            template={portfolio.template}
            content={rich.content}
            auto={rich.editor.auto}
            view={rich.editor.content}
            github={rich.github}
            pageHidden={portfolio.hiddenSections}
            showEmail={portfolio.showEmail}
          />
        </div>
        <div className="lg:sticky lg:top-6 lg:col-span-3">
          <PortfolioPreview
            view={view}
            content={rich.page.content}
            template={portfolio.template}
            slug={portfolio.slug}
            credit={showsCredit(portfolio.hideCredit, plan)}
          />
        </div>
      </div>
    </div>
  );
}
