"use client";

import { Copy, MessageCircleQuestion, Play } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { toast } from "@/components/ui/toast";
import type { InterviewPrep, PrepTarget } from "@/lib/insights/prep";
import {
  prepRounds,
  prepToText,
  ROUND_COPY,
  storyUses,
  type PrepRoundGroup,
} from "@/lib/insights/prep-view";
import { cn, pluralize } from "@/lib/utils";
import { PracticeSession } from "./practice-session";
import { QuestionCard, storyHref, type LinkedStory } from "./question-card";
import { AskBubbles } from "./speech";
import { StarScript } from "./star-script";

const YOUR_TURN_ID = "prep-your-turn";
const NODE = "flex size-8 items-center justify-center rounded-full text-sm font-medium tabular-nums";
const CHIP_NODE = "flex size-5 items-center justify-center rounded-full text-xs font-medium tabular-nums";

function roundId(group: PrepRoundGroup): string {
  return `prep-round-${group.round}`;
}

function joinNumbers(numbers: readonly number[]): string {
  if (numbers.length <= 1) return numbers.join("");
  return `${numbers.slice(0, -1).join(", ")} and ${numbers.at(-1)}`;
}

function Agenda({
  rounds,
  questions,
  asks,
  onStart,
  onCopy,
}: {
  rounds: PrepRoundGroup[];
  questions: number;
  asks: number;
  onStart: () => void;
  onCopy: () => void;
}) {
  const steps = [
    ...rounds.map((group) => ({
      id: roundId(group),
      label: ROUND_COPY[group.round].label,
      node: <span className={cn(CHIP_NODE, "bg-surface text-ink")}>{group.number}</span>,
    })),
    ...(asks > 0
      ? [
          {
            id: YOUR_TURN_ID,
            label: "Your turn",
            node: (
              <span className={cn(CHIP_NODE, "bg-primary text-white")}>
                <MessageCircleQuestion className="size-3" />
              </span>
            ),
          },
        ]
      : []),
  ];
  return (
    <FolderCard
      tab="Mock interview"
      tone="lavender"
      tabEnd={
        <Button variant="ghost" size="sm" onClick={onCopy}>
          <Copy aria-hidden />
          Copy all
        </Button>
      }
      bodyClassName="p-5 sm:p-8"
    >
      <h2 className="font-sans text-lg/7 font-medium text-ink">
        {pluralize(questions, "question")} in {pluralize(rounds.length, "round")}
        {asks > 0 ? ", then your turn" : ""}
      </h2>
      <p className="mt-1 max-w-prose text-sm/6 text-muted">
        Read each question out loud and answer it as you would in the room. How to answer sits under
        every question.
      </p>
      <nav aria-label="Rounds" className="mt-5">
        <ol className="flex flex-wrap gap-2">
          {steps.map((step) => (
            <li key={step.id}>
              <a
                href={`#${step.id}`}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface-muted pr-3 pl-2 text-sm text-ink transition-colors hover:bg-surface-strong pointer-coarse:h-11"
              >
                <span aria-hidden>{step.node}</span>
                {step.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button size="lg" onClick={onStart} disabled={questions === 0}>
          <Play aria-hidden />
          Start mock interview
        </Button>
        <p className="text-sm/5 text-subtle">One question at a time, with an optional 2‑minute timer.</p>
      </div>
    </FolderCard>
  );
}

// From sm the nodes hang in a gutter joined by a line; phones keep the width for the questions.
function Stop({
  id,
  node,
  title,
  about,
  last = false,
  children,
}: {
  id: string;
  node: ReactNode;
  title: ReactNode;
  about: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <li id={id} className={cn("relative scroll-mt-6 sm:pl-14", !last && "pb-12 sm:pb-14")}>
      {!last ? (
        <span aria-hidden className="absolute top-10 bottom-2 left-4 hidden w-px bg-ink/15 sm:block" />
      ) : null}
      <div className="flex items-start gap-3 sm:block">
        <span aria-hidden className="shrink-0 sm:absolute sm:top-0 sm:left-0">
          {node}
        </span>
        <div className="flex min-h-8 min-w-0 flex-col justify-center pt-0.5">
          <h3 className="text-lg/7 font-medium tracking-tight text-ink">{title}</h3>
          <p className="text-sm/6 text-muted">{about}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </li>
  );
}

export function PrepPack({ prep, target }: { prep: InterviewPrep; target: PrepTarget }) {
  const [practicing, setPracticing] = useState(false);
  const rounds = useMemo(() => prepRounds(prep), [prep]);
  const uses = useMemo(() => storyUses(prep), [prep]);
  const total = prep.questions.length;

  function linked(index: number | null): LinkedStory | null {
    const story = index === null ? undefined : prep.stories[index];
    return story && index !== null ? { story, href: storyHref(index) } : null;
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(prepToText(prep, target));
      toast({ title: "Copied", description: "Your prep is on the clipboard." });
    } catch {
      toast({ title: "Couldn't copy", description: "Select the text and copy it instead.", variant: "error" });
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-12">
      <Agenda
        rounds={rounds}
        questions={total}
        asks={prep.asks.length}
        onStart={() => setPracticing(true)}
        onCopy={() => void copyAll()}
      />

      <section aria-labelledby="prep-interview-heading">
        <h2 id="prep-interview-heading" className="sr-only">
          The interview, round by round
        </h2>
        {total > 0 ? (
          <ol>
            {rounds.map((group, index) => (
              <Stop
                key={group.round}
                id={roundId(group)}
                node={<span className={cn(NODE, "bg-surface text-ink ring-1 ring-border")}>{group.number}</span>}
                title={
                  <>
                    <span className="text-subtle">Round {group.number} ·</span>{" "}
                    {ROUND_COPY[group.round].label}
                  </>
                }
                about={ROUND_COPY[group.round].about}
                last={index === rounds.length - 1 && prep.asks.length === 0}
              >
                <ol className="flex flex-col gap-8">
                  {group.questions.map(({ item, number }) => (
                    <QuestionCard
                      key={item.question}
                      item={item}
                      number={number}
                      total={total}
                      story={linked(item.story)}
                    />
                  ))}
                </ol>
              </Stop>
            ))}
            {prep.asks.length > 0 ? (
              <Stop
                id={YOUR_TURN_ID}
                node={
                  <span className={cn(NODE, "bg-primary text-white")}>
                    <MessageCircleQuestion className="size-4" />
                  </span>
                }
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

      <section aria-labelledby="prep-stories-heading" className="flex flex-col gap-4">
        <div>
          <h2 id="prep-stories-heading" className="font-sans text-lg/7 font-medium text-ink">
            Your stories
          </h2>
          <p className="mt-1 max-w-prose text-sm/6 text-muted">
            Short answers built from your own resume lines. Say them out loud, and fill each blank in
            your words.
          </p>
        </div>
        {prep.stories.length > 0 ? (
          <div className="flex flex-col gap-8">
            {prep.stories.map((story, index) => (
              <FolderCard
                key={story.line}
                id={storyHref(index).slice(1)}
                tabIndex={-1}
                tab={`Story ${index + 1}`}
                className="scroll-mt-6 outline-none"
                bodyClassName="p-5 sm:p-8"
              >
                {story.place ? <p className="text-sm/5 text-subtle">{story.place}</p> : null}
                <h3 className="mt-1 text-lg/7 font-medium tracking-tight text-ink">{story.title}</h3>
                <p className="mt-2 text-sm/6 text-pretty text-muted">From your line “{story.line}”</p>
                <div className="mt-5 rounded-xl bg-surface-muted p-4 sm:p-5">
                  <p className="text-sm/5 font-medium text-ink">Say it like this</p>
                  <StarScript story={story} className="mt-4" />
                </div>
                {uses[index]?.length ? (
                  <p className="mt-4 text-sm/5 text-subtle">
                    Answers {uses[index].length === 1 ? "question" : "questions"} {joinNumbers(uses[index])}
                  </p>
                ) : null}
              </FolderCard>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-surface p-5 text-sm/6 text-muted">
            Your resume has no lines to build stories from yet. Add a few, then make a new pack.
          </p>
        )}
      </section>

      {practicing ? <PracticeSession prep={prep} target={target} onClose={() => setPracticing(false)} /> : null}
    </div>
  );
}
