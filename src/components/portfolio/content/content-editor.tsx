"use client";

import { Check, Circle, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { api, isApiError } from "@/lib/api/client";
import type { GitHubStats, PortfolioContent, PortfolioContentView } from "@/lib/portfolio/content";
import {
  contentChecklist,
  contentUsesFor,
  hiddenFields,
  type ContentField,
} from "@/lib/portfolio/content-uses";
import type { AutoContent } from "@/lib/portfolio/content-view";
import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import type { PortfolioSection, PortfolioTemplateId } from "@/lib/portfolio/types";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { EditorSection } from "../check-row";
import { putPortfolio } from "../portfolio-store";
import { CareerCard } from "./career-card";
import { flushContent, resetContentStore, useContentStore } from "./content-store";
import { MilestonesCard, NowCard, PersonalCard, WritingCard } from "./extras-cards";
import { GitHubCard } from "./github-card";
import { CONTENT_LINES, hiddenOnPage, missingList } from "./lines";
import { AboutCard, ProfileCard } from "./profile-card";
import { ProjectsCard } from "./projects-card";

type ContentEditorProps = {
  template: PortfolioTemplateId;
  content: PortfolioContent;
  // `auto` and `view` are the editor's full copy (portfolioViews().editor): nothing hidden, so a
  // section switched off on the page keeps its fields here, marked as hidden.
  auto: AutoContent;
  view: PortfolioContentView;
  github: GitHubStats | null;
  // The page's "What shows" choices, for the marks.
  pageHidden: readonly PortfolioSection[];
  showEmail: boolean;
  // The resume behind the page when it's in this browser: GitHub imports add projects to it.
  resume?: Resume | null;
  // After a GitHub import changed that resume.
  onResumeChange?: (resume: Resume) => void;
};

// The Content tab: what this design uses and what's still missing first, then one folding row per
// kind of content. Saves as you type.
export function ContentEditor({
  template,
  content,
  auto,
  view,
  github,
  pageHidden,
  showEmail,
  resume = null,
  onResumeChange,
}: ContentEditorProps) {
  // A closing tab still sends the last few keystrokes.
  useEffect(() => {
    const leave = () => void flushContent({ keepalive: true });
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      void flushContent();
    };
  }, []);

  return (
    <div className="flex flex-col">
      <CompletenessCard
        template={template}
        view={view}
        hidden={hiddenFields(pageHidden, content.hidden)}
      />
      <div className="mt-6 border-t border-border" />
      <ProfileCard
        content={content}
        auto={auto}
        view={view}
        linksHidden={hiddenOnPage(pageHidden, ["links"])}
        showEmail={showEmail}
      />
      <AboutCard content={content} auto={auto} hidden={hiddenOnPage(pageHidden, ["about"])} />
      <ProjectsCard
        content={content}
        auto={auto}
        github={github}
        hidden={hiddenOnPage(pageHidden, ["projects"])}
        resume={resume}
        onResumeChange={onResumeChange}
      />
      <CareerCard
        content={content}
        auto={auto}
        view={view}
        hidden={hiddenOnPage(pageHidden, ["experience", "education", "skills"])}
      />
      <NowCard content={content} auto={auto} />
      <MilestonesCard content={content} auto={auto} />
      <WritingCard content={content} auto={auto} />
      <PersonalCard content={content} auto={auto} />
      <GitHubCard content={content} auto={auto} github={github} />
    </div>
  );
}

function CompletenessCard({
  template,
  view,
  hidden,
}: {
  template: PortfolioTemplateId;
  view: PortfolioContentView;
  hidden: ReadonlySet<ContentField>;
}) {
  const status = useContentStore((state) => state.status);
  const uses = contentUsesFor(template);
  const items = contentChecklist(view, uses, hidden);
  const missing = missingList(items);
  const name = PORTFOLIO_TEMPLATE_INFO[template]?.name ?? "This design";
  const message =
    status === "loading"
      ? CONTENT_LINES.loading
      : uses.length === 0
        ? CONTENT_LINES.resumeOnly
        : missing
          ? CONTENT_LINES.missing(missing)
          : CONTENT_LINES.complete;
  const done = items.filter((item) => item.done).length;

  return (
    <EditorSection title="Your page's content">
      <OttoNote
        size="sm"
        message={message}
        live
        meta={uses.length > 0 ? `${name} · ${done} of ${items.length} filled in` : name}
      />
      {uses.length > 0 ? (
        <>
          <ul
            aria-label={`What ${name} uses`}
            className="divide-y divide-border border-y border-border"
          >
            {items.map((item) => (
              <li key={item.field} className="flex min-h-10 items-center gap-3 py-2">
                {item.hidden ? (
                  <EyeOff className="size-4 shrink-0 text-subtle" aria-hidden />
                ) : item.done ? (
                  <Check className="size-4 shrink-0 text-pass" aria-hidden />
                ) : (
                  <Circle className="size-4 shrink-0 text-subtle" aria-hidden />
                )}
                <span
                  className={cn(
                    "text-sm/5",
                    item.done || item.hidden ? "text-muted" : "font-medium text-ink",
                  )}
                >
                  {item.label}
                  <span className="sr-only">
                    {item.hidden ? ": hidden on your page" : item.done ? ": done" : ": to do"}
                  </span>
                </span>
                <span className="ml-auto truncate text-xs/5 text-subtle">{item.note}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </EditorSection>
  );
}

/** "Delete this page", at the end of Settings: the screen's one confirm, since it can't come back. */
export function DeletePortfolio() {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await api.deletePortfolio();
      resetContentStore();
      putPortfolio(null);
      toast({
        title: "Your page is deleted",
        description: "Its address and content are gone. Your resume is untouched.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Couldn't delete your page",
        description: isApiError(error) ? error.message : undefined,
        variant: "error",
      });
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {asking ? (
        <>
          <p className="w-full text-sm/6 text-muted">
            This deletes the page, its address and everything you added for it. It can&apos;t be
            undone.
          </p>
          <Button size="sm" variant="danger" loading={busy} onClick={() => void remove()}>
            Delete page
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
            Keep it
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="-ml-3 text-fail"
          onClick={() => setAsking(true)}
        >
          Delete this page
        </Button>
      )}
    </div>
  );
}
