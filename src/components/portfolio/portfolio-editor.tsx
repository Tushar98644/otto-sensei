"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { resumeLabel } from "@/components/studio/resume-label";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import type { Portfolio, PortfolioTemplateId } from "@/lib/portfolio/types";
import { sectionsWithContent } from "@/lib/portfolio/view";
import type { Resume } from "@/lib/resume/schema";
import { ContentEditor } from "./content/content-editor";
import { usePortfolioContent } from "./content/use-content";
import { EditorBar } from "./editor-bar";
import { PORTFOLIO_LINES, portfolioFacts } from "./lines";
import { PortfolioPreview } from "./portfolio-preview";
import { savePortfolio, usePortfolioStore } from "./portfolio-store";
import { SettingsCard } from "./settings-card";
import { TemplatePicker } from "./template-picker";
import { VisibilityCard } from "./visibility-card";

// Loaded on the first "Full screen" or phone "Preview": it brings every design with it.
const FullPortfolioPreview = lazy(() =>
  import("./full-preview").then((module) => ({ default: module.FullPortfolioPreview })),
);

const TABS = [
  { value: "design", label: "Design" },
  { value: "content", label: "Content" },
  { value: "sections", label: "Sections" },
  { value: "settings", label: "Settings" },
] as const;
type EditorTab = (typeof TABS)[number]["value"];

// The same width the panel and the preview split at (Tailwind's lg).
const SIDE_BY_SIDE = "(min-width: 64rem)";

type PortfolioEditorProps = {
  portfolio: Portfolio;
  resumes: readonly Resume[];
  // A resume card asked for a portfolio while one already exists from another resume.
  offer: Resume | null;
  onOfferDone: () => void;
};

// A workspace: the top bar, then a panel with one tab open at a time beside the live page. From lg
// it fills the window (the app shell drops its padding for [data-workspace]) and the panel and the
// preview scroll on their own; on phones it's one column with the preview full screen behind a
// button. Every change saves at once.
export function PortfolioEditor({ portfolio, resumes, offer, onOfferDone }: PortfolioEditorProps) {
  const saving = usePortfolioStore((state) => state.saving);
  const source = resumes.find((resume) => resume.id === portfolio.resumeId) ?? null;
  const behind = source !== null && source.updatedAt > portfolio.versionAt;
  // In sync, the page is about to take this browser's copy; else it keeps the one it has.
  const shown = portfolio.sync && source ? source : portfolio.snapshot;
  // The page as readers get it (the preview) and, for the content editor, everything the owner
  // has: hiding a section only changes the page.
  const rich = usePortfolioContent(portfolio, shown);
  const view = rich.page.view;
  // The page as readers get it, for the Design cards' and the full preview's "Your page" side.
  const own = useMemo(() => ({ view, content: rich.page.content }), [view, rich.page.content]);
  const sections = useMemo(() => sectionsWithContent(shown), [shown]);
  const [tab, setTab] = useState<EditorTab>("design");
  const [full, setFull] = useState<PortfolioTemplateId | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Each tab keeps its own place in the panel, so a trip to Design doesn't lose a long form.
  const scrolled = useRef(new Map<EditorTab, number>());

  // Cloud backups already carry edits to a synced page; this covers edits that haven't been
  // backed up yet when the owner opens this screen. Once per version.
  const pushed = useRef<number | null>(null);
  useEffect(() => {
    if (!portfolio.sync || !source || !behind || saving) return;
    if (pushed.current === source.updatedAt) return;
    pushed.current = source.updatedAt;
    void savePortfolio({ resume: source });
  }, [portfolio.sync, source, behind, saving]);

  function changeTab(value: string) {
    const next = TABS.find((item) => item.value === value)?.value ?? "design";
    const body = bodyRef.current;
    const sideBySide = window.matchMedia(SIDE_BY_SIDE).matches;
    if (body && sideBySide) scrolled.current.set(tab, body.scrollTop);
    setTab(next);
    requestAnimationFrame(() => {
      if (body && sideBySide) body.scrollTop = scrolled.current.get(next) ?? 0;
      // Phones scroll the page: bring the new tab's start up under the pinned tab strip.
      else if (panelRef.current && panelRef.current.getBoundingClientRect().top < 0)
        panelRef.current.scrollIntoView({ block: "start" });
    });
  }

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
    <div
      data-workspace
      className="flex flex-col gap-5 max-lg:pb-24 lg:h-dvh lg:gap-4 lg:px-6 lg:pt-4 lg:pb-6"
    >
      <EditorBar portfolio={portfolio} onPreview={() => setFull(portfolio.template)} />

      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row">
        <div
          ref={panelRef}
          className="flex scroll-mt-29 flex-col rounded-2xl bg-surface lg:min-h-0 lg:w-88 lg:shrink-0 xl:w-104 2xl:w-md"
        >
          <Tabs value={tab} onValueChange={changeTab} className="gap-0 lg:min-h-0 lg:flex-1">
            {/* Pinned under the phone's app bar (h-14 plus its section strip, 116px). */}
            <div className="sticky top-29 z-10 rounded-t-2xl border-b border-border bg-surface px-4 pt-4 pb-3 sm:px-6 lg:static">
              <TabList aria-label="Edit your portfolio" className="flex w-full self-stretch">
                {TABS.map((item) => (
                  <Tab key={item.value} value={item.value} className="flex-1 px-2">
                    {item.label}
                  </Tab>
                ))}
              </TabList>
            </div>
            <div
              ref={bodyRef}
              className="@container px-4 pt-6 pb-8 sm:px-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain"
            >
              {offer ? (
                <Alert
                  className="mb-6"
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
              <TabPanel value="design" keepMounted className="flex flex-col gap-8">
                <OttoNote size="sm" message={message} meta={facts || undefined} />
                <div className="border-t border-border pt-8">
                  <TemplatePicker
                    value={portfolio.template}
                    onChange={(template) => void savePortfolio({ template })}
                    own={own}
                  />
                </div>
              </TabPanel>
              <TabPanel value="content" keepMounted>
                <ContentEditor
                  template={portfolio.template}
                  content={rich.content}
                  auto={rich.editor.auto}
                  view={rich.editor.content}
                  github={rich.github}
                  pageHidden={portfolio.hiddenSections}
                  showEmail={portfolio.showEmail}
                  resume={source}
                  // A page that isn't kept in sync still takes the projects it was just given.
                  onResumeChange={(next) => {
                    if (!portfolio.sync) void savePortfolio({ resume: next });
                  }}
                />
              </TabPanel>
              <TabPanel value="sections" keepMounted>
                <VisibilityCard
                  portfolio={portfolio}
                  sections={sections}
                  email={shown.basics.email.trim()}
                  phone={shown.basics.phone.trim()}
                  disabled={false}
                />
              </TabPanel>
              <TabPanel value="settings" keepMounted>
                <SettingsCard
                  portfolio={portfolio}
                  resumes={resumes}
                  source={source}
                  behind={behind}
                  disabled={saving}
                />
              </TabPanel>
            </div>
          </Tabs>
        </div>

        <div className="hidden lg:flex lg:min-h-0 lg:min-w-0 lg:flex-1 lg:flex-col">
          <PortfolioPreview
            view={view}
            content={rich.page.content}
            template={portfolio.template}
            slug={portfolio.slug}
            onExpand={() => setFull(portfolio.template)}
          />
        </div>
      </div>

      {full ? (
        <Suspense fallback={null}>
          <FullPortfolioPreview
            id={full}
            own={own}
            note={full === portfolio.template ? "In use on your page." : "Not on your page yet."}
            action={
              full === portfolio.template
                ? null
                : {
                    label: "Use this design",
                    onSelect: () => void savePortfolio({ template: full }),
                  }
            }
            onChange={setFull}
            onClose={() => setFull(null)}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
