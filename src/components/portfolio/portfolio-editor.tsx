"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { resumeLabel } from "@/components/studio/resume-label";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { fmt } from "@/i18n/format";
import { useFormat, useMessages } from "@/i18n/client";
import type { Portfolio, PortfolioTemplateId } from "@/lib/portfolio/types";
import { sectionsWithContent } from "@/lib/portfolio/view";
import type { Resume } from "@/lib/resume/schema";
import { ContentEditor } from "./content/content-editor";
import { usePortfolioContent } from "./content/use-content";
import { EditorBar } from "./editor-bar";
import { liveLine, portfolioFacts } from "./lines";
import { PortfolioPreview } from "./portfolio-preview";
import { savePortfolio, usePortfolioStore } from "./portfolio-store";
import { SettingsCard } from "./settings-card";
import { TemplatePicker } from "./template-picker";
import { useResumeLink } from "./use-resume-link";
import { VisibilityCard } from "./visibility-card";

const FullPortfolioPreview = lazy(() =>
  import("./full-preview").then((module) => ({ default: module.FullPortfolioPreview })),
);

const TABS = ["design", "content", "sections", "settings"] as const;
type EditorTab = (typeof TABS)[number];

const SIDE_BY_SIDE = "(min-width: 64rem)";

type PortfolioEditorProps = {
  portfolio: Portfolio;
  resumes: readonly Resume[];
  offer: Resume | null;
  onOfferDone: () => void;
};

export function PortfolioEditor({ portfolio, resumes, offer, onOfferDone }: PortfolioEditorProps) {
  const words = useMessages("portfolio");
  const format = useFormat();
  const saving = usePortfolioStore((state) => state.saving);
  const source = resumes.find((resume) => resume.id === portfolio.resumeId) ?? null;
  const behind = source !== null && source.updatedAt > portfolio.versionAt;
  const shown = portfolio.sync && source ? source : portfolio.snapshot;
  const rich = usePortfolioContent(portfolio, shown);
  const view = rich.page.view;
  const own = useMemo(() => ({ view, content: rich.page.content }), [view, rich.page.content]);
  // A keystroke commits first; the previews redraw the page in the background after it.
  const preview = useDeferredValue(own);
  const sections = useMemo(() => sectionsWithContent(shown), [shown]);
  const resumeLink = useResumeLink(portfolio, shown);
  const [tab, setTab] = useState<EditorTab>("design");
  const [full, setFull] = useState<PortfolioTemplateId | null>(null);
  const expand = useCallback(() => setFull(portfolio.template), [portfolio.template]);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrolled = useRef(new Map<EditorTab, number>());

  const pushed = useRef<number | null>(null);
  useEffect(() => {
    if (!portfolio.sync || !source || !behind || saving) return;
    if (pushed.current === source.updatedAt) return;
    pushed.current = source.updatedAt;
    void savePortfolio({ resume: source }, words.store);
  }, [portfolio.sync, source, behind, saving, words.store]);

  function changeTab(value: string) {
    const next = TABS.find((item) => item === value) ?? "design";
    const body = bodyRef.current;
    const sideBySide = window.matchMedia(SIDE_BY_SIDE).matches;
    if (body && sideBySide) scrolled.current.set(tab, body.scrollTop);
    setTab(next);
    requestAnimationFrame(() => {
      if (body && sideBySide) body.scrollTop = scrolled.current.get(next) ?? 0;
      else if (panelRef.current && panelRef.current.getBoundingClientRect().top < 0)
        panelRef.current.scrollIntoView({ block: "start" });
    });
  }

  const message = !source
    ? words.otto.noResume
    : behind && !portfolio.sync
      ? words.otto.behind
      : portfolio.published
        ? liveLine(words, format, portfolio.views)
        : words.otto.draft;
  const facts = portfolioFacts(words, format, {
    projects: view.projects.length,
    jobs: view.experience.length,
    skills: view.skills.reduce((total, group) => total + group.items.length, 0),
  });

  return (
    <div
      data-workspace
      className="flex flex-col gap-5 max-lg:pb-24 lg:h-dvh lg:gap-4 lg:px-6 lg:pt-4 lg:pb-6"
    >
      <EditorBar portfolio={portfolio} onPreview={expand} />

      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row">
        <div
          ref={panelRef}
          className="flex scroll-mt-29 flex-col rounded-2xl bg-surface lg:min-h-0 lg:w-88 lg:shrink-0 xl:w-104 2xl:w-md"
        >
          <Tabs value={tab} onValueChange={changeTab} className="gap-0 lg:min-h-0 lg:flex-1">
            {/* Pinned under the phone's app bar (h-14 plus its section strip, 116px). */}
            <div className="sticky top-29 z-10 rounded-t-2xl border-b border-border bg-surface px-4 pt-4 pb-3 sm:px-6 lg:static">
              <TabList aria-label={words.editLabel} className="flex w-full self-stretch">
                {TABS.map((item) => (
                  <Tab key={item} value={item} className="flex-1 px-2">
                    {words.tabs[item]}
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
                  title={fmt(words.offer.title, { name: resumeLabel(offer) })}
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={saving}
                        onClick={async () => {
                          if (await savePortfolio({ resume: offer }, words.store)) onOfferDone();
                        }}
                      >
                        {words.offer.use}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={onOfferDone}>
                        {words.offer.keep}
                      </Button>
                    </div>
                  }
                >
                  {fmt(words.offer.shows, {
                    current: source
                      ? fmt(words.offer.quoted, { name: resumeLabel(source) })
                      : words.offer.another,
                  })}
                </Alert>
              ) : null}
              <TabPanel value="design" keepMounted className="flex flex-col gap-8">
                <OttoNote size="sm" message={message} meta={facts || undefined} />
                <div className="border-t border-border pt-8">
                  <TemplatePicker
                    value={portfolio.template}
                    onChange={(template) => void savePortfolio({ template }, words.store)}
                    own={preview}
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
                  onResumeChange={(next) => {
                    if (!portfolio.sync) void savePortfolio({ resume: next }, words.store);
                  }}
                />
              </TabPanel>
              <TabPanel value="sections" keepMounted>
                <VisibilityCard
                  portfolio={portfolio}
                  sections={sections}
                  email={shown.basics.email.trim()}
                  phone={shown.basics.phone.trim()}
                  resumeLink={resumeLink}
                  source={source}
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
            view={preview.view}
            content={preview.content}
            template={portfolio.template}
            slug={portfolio.slug}
            resumeHref={resumeLink.href}
            onExpand={expand}
          />
        </div>
      </div>

      {full ? (
        <Suspense fallback={null}>
          <FullPortfolioPreview
            id={full}
            own={own}
            note={full === portfolio.template ? words.inUseNote : words.notYetNote}
            resumeHref={resumeLink.href}
            action={
              full === portfolio.template
                ? null
                : {
                    label: words.useDesign,
                    onSelect: () => void savePortfolio({ template: full }, words.store),
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
