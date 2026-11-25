"use client";

import { lazy, Suspense, useId, useMemo, useState } from "react";
import { NewResumeMenu } from "@/components/dashboard/new-resume-menu";
import { useStudioActions } from "@/components/dashboard/use-studio-actions";
import { Otto } from "@/components/mascot/otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { resumeLabel, tailoredLabel } from "@/components/studio/resume-label";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { PortfolioTemplateId } from "@/lib/portfolio/types";
import type { Resume } from "@/lib/resume/schema";
import { makePortfolio, usePortfolioStore } from "./portfolio-store";
import { PreviewSourceBar, usePreviewSource } from "./preview-source";
import { pageSample } from "./sample";
import { TemplateGallery } from "./template-gallery";

const FullPortfolioPreview = lazy(() =>
  import("./full-preview").then((module) => ({ default: module.FullPortfolioPreview })),
);

function NoResumes() {
  const words = useMessages("portfolio");
  const actions = useStudioActions();
  return (
    <section className="flex flex-col items-center rounded-3xl bg-surface px-6 py-12 text-center sm:py-16">
      <Otto pose="wave" size={128} title={words.start.waving} className="size-28 sm:size-32" />
      <h2 className="mt-6 font-sans text-lg/7 font-medium text-ink">{words.start.noResume}</h2>
      <p className="mt-2 max-w-md text-sm/6 text-pretty text-muted">{words.otto.noResumes}</p>
      <div className="mt-6">
        <NewResumeMenu actions={actions} />
      </div>
    </section>
  );
}

export function PortfolioStart({ candidates }: { candidates: readonly Resume[] }) {
  const words = useMessages("portfolio");
  const selectId = useId();
  const saving = usePortfolioStore((state) => state.saving);
  const [picked, setPicked] = useState<string | null>(null);
  const [full, setFull] = useState<PortfolioTemplateId | null>(null);
  const [chosen, setChosen] = useState<PortfolioTemplateId | null>(null);
  const resume = candidates.find((item) => item.id === picked) ?? candidates[0] ?? null;
  const own = useMemo(() => (resume ? pageSample(null, [resume]) : null), [resume]);
  const choice = usePreviewSource(own);

  if (!resume) return <NoResumes />;

  const choose = (template: PortfolioTemplateId) => {
    if (saving) return;
    setChosen(template);
    void makePortfolio(resume, words.store, template);
  };

  return (
    <section className="rounded-3xl bg-surface px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-sans text-2xl/8 font-medium tracking-tight text-ink">
            {words.start.title}
          </h2>
          <p className="mt-2 text-base/7 text-pretty text-muted">{words.start.intro}</p>
        </div>
        {candidates.length > 1 ? (
          <div className="flex w-full flex-col gap-2 sm:max-w-xs">
            <Label htmlFor={selectId}>{words.start.makeFrom}</Label>
            <Select
              id={selectId}
              value={resume.id}
              onChange={(event) => setPicked(event.currentTarget.value)}
            >
              {candidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {[resumeLabel(item), tailoredLabel(item)].filter(Boolean).join(" · ")}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      <OttoNote
        size="sm"
        className="mt-8"
        message={choice.source === "own" ? words.otto.pick : words.otto.pickThin}
      />

      <PreviewSourceBar choice={choice} className="mt-6" />

      <TemplateGallery
        className="mt-4"
        sample={choice.sample}
        onPreview={setFull}
        action={(id, name) => (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            disabled={saving && chosen !== id}
            loading={saving && chosen === id}
            onClick={() => choose(id)}
            aria-label={fmt(words.useDesignNamed, { name })}
          >
            {words.useDesign}
          </Button>
        )}
      />

      {full ? (
        <Suspense fallback={null}>
          <FullPortfolioPreview
            id={full}
            own={own}
            onChange={setFull}
            onClose={() => setFull(null)}
            action={{ label: words.useDesign, onSelect: () => choose(full) }}
          />
        </Suspense>
      ) : null}
    </section>
  );
}
