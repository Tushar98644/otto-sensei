"use client";

import { MessageCircleQuestion, Play } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { CueCardsArt } from "@/components/dashboard/interview/interview-art";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FolderCard } from "@/components/ui/folder-card";
import type { InterviewPrep, PrepTarget } from "@/lib/insights/prep";
import {
  focusLine,
  practiceSteps,
  prepStops,
  questionCount,
  stopCopy,
  storyUses,
  type PrepStop,
} from "@/lib/insights/prep-view";
import { cn, pluralize } from "@/lib/utils";
import { LazyPractice } from "./lazy-practice";
import { PracticeMeter } from "./practice-meter";
import { usePractice } from "./practice-store";
import { QuestionCard, storyHref, type LinkedStory } from "./prep-question";
import { StoryCard } from "./prep-story";
import { TechnicalCard } from "./prep-technical";
import { AskBubbles } from "./speech";

const YOUR_TURN_ID = "prep-your-turn";
const STORIES_ID = "prep-stories";
const NODE =
  "flex size-8 items-center justify-center rounded-full text-sm font-medium tabular-nums";
const CHIP_NODE =
  "flex size-5 items-center justify-center rounded-full text-xs font-medium tabular-nums";
const TAB_HEADING = "font-sans text-xs/4 font-medium";

function roundId(group: PrepStop): string {
  return `prep-round-${group.round}`;
}

type Practice = { open: boolean; startAt: number | null };

function Agenda({ rounds, asks }: { rounds: PrepStop[]; asks: number }) {
  return (
    <nav aria-label="Rounds" className="xl:hidden">
      <ol className="flex flex-wrap gap-2">
        {rounds.map((group) => (
          <li key={group.round}>
            <a
              href={`#${roundId(group)}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface-muted pr-3 pl-2 text-sm text-ink transition-colors hover:bg-surface-strong pointer-coarse:h-11"
            >
              <span aria-hidden className={cn(CHIP_NODE, "bg-surface text-ink")}>
                {group.number}
              </span>
              {stopCopy(group).label}
            </a>
          </li>
        ))}
        {asks > 0 ? (
          <li>
            <a
              href={`#${YOUR_TURN_ID}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface-muted pr-3 pl-2 text-sm text-ink transition-colors hover:bg-surface-strong pointer-coarse:h-11"
            >
              <span aria-hidden className={cn(CHIP_NODE, "bg-primary text-white")}>
                <MessageCircleQuestion className="size-3" />
              </span>
              Your turn
            </a>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}

// The rail that strings the rounds together, as the interview runs: one stop per round, then your turn.
function Stop({
  id,
  node,
  eyebrow,
  title,
  about,
  badge,
  last = false,
  children,
}: {
  id: string;
  node: ReactNode;
  eyebrow: string;
  title: string;
  about: string;
  badge?: ReactNode;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <li id={id} className={cn("relative scroll-mt-6 sm:pl-14", !last && "pb-12 sm:pb-14")}>
      {!last ? (
        <span
          aria-hidden
          className="absolute top-10 bottom-2 left-4 hidden w-px bg-ink/12 sm:block print:hidden"
        />
      ) : null}
      <div className="flex items-start gap-3 sm:block">
        <span aria-hidden className="shrink-0 sm:absolute sm:top-0 sm:left-0">
          {node}
        </span>
        <div className="flex min-h-8 min-w-0 flex-col justify-center">
          <Eyebrow>{eyebrow}</Eyebrow>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="font-sans text-lg/7 font-medium tracking-tight text-ink">{title}</h2>
            {badge}
          </div>
          <p className="text-sm/6 text-pretty text-muted">{about}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </li>
  );
}

function Contents({
  rounds,
  asks,
  stories,
  got,
  total,
  onPractise,
}: {
  rounds: PrepStop[];
  asks: number;
  stories: number;
  got: number;
  total: number;
  onPractise: () => void;
}) {
  const link =
    "flex min-h-9 items-center gap-2.5 rounded-lg px-2 text-sm text-ink transition-colors hover:bg-ink/5";
  return (
    <aside className="hidden self-start xl:sticky xl:top-8 xl:block print:hidden">
      <nav aria-label="In this pack" className="flex flex-col gap-2">
        <Eyebrow className="px-2">In this pack</Eyebrow>
        <ol className="flex flex-col gap-0.5">
          {rounds.map((group) => (
            <li key={group.round}>
              <a href={`#${roundId(group)}`} className={link}>
                <span
                  aria-hidden
                  className={cn(CHIP_NODE, "bg-surface text-ink ring-1 ring-border")}
                >
                  {group.number}
                </span>
                <span className="min-w-0 flex-1">{stopCopy(group).label}</span>
                <span className="text-xs text-subtle tabular-nums">{group.questions.length}</span>
              </a>
            </li>
          ))}
          {asks > 0 ? (
            <li>
              <a href={`#${YOUR_TURN_ID}`} className={link}>
                <span aria-hidden className={cn(CHIP_NODE, "bg-primary text-white")}>
                  <MessageCircleQuestion className="size-3" />
                </span>
                <span className="min-w-0 flex-1">Your turn</span>
                <span className="text-xs text-subtle tabular-nums">{asks}</span>
              </a>
            </li>
          ) : null}
          {stories > 0 ? (
            <li>
              <a href={`#${STORIES_ID}`} className={link}>
                <span
                  aria-hidden
                  className={cn(
                    CHIP_NODE,
                    "bg-otter-light text-[0.625rem] font-semibold text-otter",
                  )}
                >
                  S
                </span>
                <span className="min-w-0 flex-1">Your stories</span>
                <span className="text-xs text-subtle tabular-nums">{stories}</span>
              </a>
            </li>
          ) : null}
        </ol>
      </nav>
      {total > 0 ? (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card ring-1 ring-ink/6">
          <PracticeMeter got={got} total={total} barClassName="flex-1" className="w-full" />
          <Button variant="secondary" size="sm" onClick={onPractise}>
            <Play aria-hidden />
            {got === 0 ? "Start practising" : got >= total ? "Practise again" : "Keep practising"}
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

export function PrepPack({
  prep,
  target,
  storageKey,
}: {
  prep: InterviewPrep;
  target: PrepTarget;
  storageKey: string;
}) {
  const [practice, setPractice] = useState<Practice>({ open: false, startAt: null });
  const rounds = useMemo(() => prepStops(prep), [prep]);
  const uses = useMemo(() => storyUses(prep), [prep]);
  const record = usePractice(storageKey);
  const total = questionCount(prep);
  const got = useMemo(() => practiceSteps(prep), [prep]).filter(
    (step) => record.marks[step.item.question] === "got",
  ).length;
  const startLabel =
    got === 0 ? "Start practising" : got >= total ? "Practise again" : "Keep practising";

  function linked(index: number | null): LinkedStory | null {
    const story = index === null ? undefined : prep.stories[index];
    return story && index !== null ? { story, href: storyHref(index) } : null;
  }

  function practise(startAt: number | null = null) {
    setPractice({ open: true, startAt });
  }

  return (
    <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_13.5rem] xl:gap-10">
      <div className="flex min-w-0 flex-col gap-14">
        {total > 0 ? (
          <FolderCard
            tab={<h2 className={TAB_HEADING}>Practice</h2>}
            tone="lavender"
            bodyClassName="p-2"
            className="print:hidden"
          >
            <div className="group/art group/otto grid gap-2 motion-safe:animate-fade-in sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
              <CueCardsArt className="h-36 sm:h-full sm:min-h-52" />
              <div className="flex min-w-0 flex-col items-start gap-5 px-2 pt-2 pb-2 sm:px-4 sm:py-5 lg:px-6">
                <div className="flex flex-col gap-2">
                  <Eyebrow>Otto plays the interviewer</Eyebrow>
                  <p className="font-display text-2xl/8 font-normal tracking-tight text-pretty text-ink sm:text-3xl/9">
                    {pluralize(total, "question")} in {pluralize(rounds.length, "round")}
                    {prep.asks.length > 0 ? ", then your turn" : ""}
                  </p>
                  <p className="max-w-prose text-sm/6 text-pretty text-muted">
                    One question at a time. Answer out loud, peek at your outline when you need it,
                    and fill the blanks in your words.
                  </p>
                </div>
                <Agenda rounds={rounds} asks={prep.asks.length} />
                <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-3">
                  <Button size="lg" onClick={() => practise()} className="max-sm:w-full">
                    <Play aria-hidden />
                    {startLabel}
                  </Button>
                  <PracticeMeter got={got} total={total} barClassName="w-24" />
                </div>
              </div>
            </div>
          </FolderCard>
        ) : null}

        <section aria-label="The interview, round by round">
          {total > 0 ? (
            <ol>
              {rounds.map((group, index) => (
                <Stop
                  key={group.round}
                  id={roundId(group)}
                  node={
                    group.round === "technical" ? (
                      <span
                        className={cn(
                          NODE,
                          "bg-lavender text-ink shadow-control ring-1 ring-ink/10",
                        )}
                      >
                        {group.number}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          NODE,
                          "bg-surface text-ink shadow-control ring-1 ring-border",
                        )}
                      >
                        {group.number}
                      </span>
                    )
                  }
                  eyebrow={`Round ${group.number} · ${pluralize(group.questions.length, "question")}`}
                  title={stopCopy(group).label}
                  about={stopCopy(group).about}
                  badge={
                    group.round === "technical" ? (
                      <span className="inline-flex h-6 items-center rounded-full bg-lavender px-2.5 text-xs font-medium text-ink">
                        {focusLine(group.section)}
                      </span>
                    ) : undefined
                  }
                  last={index === rounds.length - 1 && prep.asks.length === 0}
                >
                  <ol
                    className={cn("flex flex-col", group.round === "technical" ? "gap-8" : "gap-5")}
                  >
                    {group.round === "technical"
                      ? group.questions.map(({ item, number }) => (
                          <TechnicalCard
                            key={item.question}
                            item={item}
                            focus={group.section.focus}
                            number={number}
                            total={total}
                            mark={record.marks[item.question]}
                            onPractise={() => practise(number)}
                          />
                        ))
                      : group.questions.map(({ item, number }) => (
                          <QuestionCard
                            key={item.question}
                            item={item}
                            number={number}
                            total={total}
                            story={linked(item.story)}
                            mark={record.marks[item.question]}
                            onPractise={() => practise(number)}
                          />
                        ))}
                  </ol>
                </Stop>
              ))}
              {prep.asks.length > 0 ? (
                <Stop
                  id={YOUR_TURN_ID}
                  node={
                    <span className={cn(NODE, "bg-primary text-white shadow-key")}>
                      <MessageCircleQuestion className="size-4" />
                    </span>
                  }
                  eyebrow={pluralize(prep.asks.length, "question")}
                  title="Your turn"
                  about="They'll ask what you'd like to know. Pick two or three of these."
                  last
                >
                  <AskBubbles asks={prep.asks} surface="mist" />
                </Stop>
              ) : null}
            </ol>
          ) : (
            <p className="rounded-2xl bg-surface p-5 text-sm/6 text-muted">
              No questions this time. Try making a new pack.
            </p>
          )}
        </section>

        <section
          id={STORIES_ID}
          aria-labelledby="prep-stories-heading"
          className="flex scroll-mt-6 flex-col gap-6"
        >
          <div>
            <h2
              id="prep-stories-heading"
              className="font-display text-3xl/9 font-normal tracking-tight text-ink"
            >
              Your stories
            </h2>
            <p className="mt-1 max-w-prose text-sm/6 text-pretty text-muted">
              Each one starts from a line on your resume. Say it out loud, and fill each blank in
              your words.
            </p>
          </div>
          {prep.stories.length > 0 ? (
            <div className="flex flex-col gap-10">
              {prep.stories.map((story, index) => (
                <StoryCard
                  key={story.line}
                  story={story}
                  index={index}
                  id={storyHref(index).slice(1)}
                  uses={uses[index] ?? []}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-surface p-5 text-sm/6 text-muted">
              Your resume has no lines to build stories from yet. Add a few, then make a new pack.
            </p>
          )}
        </section>
      </div>

      <Contents
        rounds={rounds}
        asks={prep.asks.length}
        stories={prep.stories.length}
        got={got}
        total={total}
        onPractise={() => practise()}
      />

      <LazyPractice
        open={practice.open}
        prep={prep}
        target={target}
        storageKey={storageKey}
        startAt={practice.startAt}
        onClose={() => setPractice({ open: false, startAt: null })}
      />
    </div>
  );
}
