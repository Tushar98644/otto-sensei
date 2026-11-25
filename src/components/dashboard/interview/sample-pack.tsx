"use client";

import { useId, useMemo } from "react";
import { QuestionCard } from "@/components/dashboard/applications/prep/prep-question";
import { StoryCard } from "@/components/dashboard/applications/prep/prep-story";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { PrepQuestion, StarStory } from "@/lib/insights/prep";
import type { PrepMessages } from "../i18n";

const STORY_ID = "sample-story-1";

// Written by hand for the Jordan Ellis sample resume (lib/resume/sample.ts), so every fact is one of its lines.
function sampleQuestions({ questions: q }: PrepMessages["sample"]): readonly PrepQuestion[] {
  return [
    {
      round: "opening",
      question: q.opening.question,
      checking: q.opening.checking,
      followUp: q.opening.followUp,
      points: [q.opening.first, q.opening.second],
      story: null,
    },
    {
      round: "behavioural",
      question: q.launch.question,
      checking: q.launch.checking,
      followUp: q.launch.followUp,
      points: [q.launch.first, q.launch.second, q.launch.third],
      story: 0,
    },
    {
      round: "skills",
      question: q.pricing.question,
      checking: q.pricing.checking,
      followUp: "",
      points: [q.pricing.first, q.pricing.second],
      story: null,
    },
  ];
}

// What the resume doesn't say stays a blank to fill, as in a real pack.
function sampleStory({ story }: PrepMessages["sample"]): StarStory {
  return { ...story };
}

export function SamplePack() {
  const { sample } = useMessages("prep");
  const headingId = useId();
  const questions = useMemo(() => sampleQuestions(sample), [sample]);
  const story = useMemo(() => sampleStory(sample), [sample]);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <Eyebrow>{sample.eyebrow}</Eyebrow>
          <h2
            id={headingId}
            className="mt-1 font-display text-3xl/9 font-normal tracking-tight text-pretty text-ink"
          >
            {fmt(sample.title, { job: sample.job })}
          </h2>
          <p className="mt-1 max-w-prose text-sm/6 text-pretty text-muted">{sample.about}</p>
        </div>
        <p className="text-xs/5 text-subtle">{sample.who}</p>
      </div>
      <div className="flex flex-col gap-10 mask-b-from-70%">
        <ol className="flex flex-col gap-5">
          {questions.map((item, index) => (
            <QuestionCard
              key={item.question}
              item={item}
              number={index + 1}
              total={questions.length}
              story={item.story === null ? null : { story, href: `#${STORY_ID}` }}
            />
          ))}
        </ol>
        <StoryCard story={story} index={0} id={STORY_ID} uses={[2]} />
      </div>
    </section>
  );
}
