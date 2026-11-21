import { useId } from "react";
import { Speaker } from "@/components/dashboard/applications/prep/speech";
import { StarScript } from "@/components/dashboard/applications/prep/star-script";
import { FolderCard } from "@/components/ui/folder-card";
import type { StarStory } from "@/lib/insights/prep";

// Written by hand for the Jordan Ellis sample resume (lib/resume/sample.ts), so every fact is one of its lines.
const SAMPLE_JOB = "Senior Product Marketing Manager";

const SAMPLE_QUESTIONS: readonly { question: string; checking: string }[] = [
  {
    question: "Walk me through your background and what brought you to product marketing.",
    checking: "That you can tell a short, clear story about your path and land it on this job.",
  },
  {
    question: "Tell me about a launch you led. What did you do, and what changed?",
    checking: "That you can own a launch from start to finish and show the result in numbers.",
  },
  {
    question: "How have you used pricing or messaging to move a number?",
    checking: "How you work with other teams and measure what your work changed.",
  },
];

// What the resume doesn't say stays a blank to fill, as in a real pack.
const SAMPLE_STORY: StarStory = {
  title: "The analytics add-on launch",
  line: "Led the launch of an analytics add-on that reached 1,200 paying teams and $1.4M in yearly revenue in its first 12 months.",
  place: "Brightloop, Product Marketing Manager",
  situation: "Brightloop was launching an analytics add-on, and [what the launch needed to prove].",
  task: "I led the launch: the positioning, the messaging and the materials sales would use.",
  action:
    "I ran customer interviews to sharpen the positioning, defined the messaging with the product managers and created the sales materials.",
  result: "It reached 1,200 paying teams and $1.4M in yearly revenue in its first 12 months.",
};

export function SamplePack() {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <FolderCard
        tab="Example"
        tabEnd={<span className="text-xs text-subtle">Jordan Ellis, a sample resume</span>}
        bodyClassName="p-5 sm:p-8"
      >
        <div className="flex flex-col gap-8 mask-b-from-75%">
          <div className="flex flex-col gap-1">
            <h2 id={headingId} className="font-sans text-lg/7 font-medium text-ink">
              Prep for {SAMPLE_JOB}
            </h2>
            <p className="text-sm/6 text-muted">
              Likely questions round by round, and stories outlined from the resume&apos;s own lines.
            </p>
          </div>
          <ol className="flex flex-col gap-6">
            <SampleQuestion index={0} />
            <SampleQuestion index={1} />
            <li className="flex flex-col gap-4 rounded-2xl bg-surface-muted p-5 sm:p-6">
              <div>
                <p className="text-xs/4 font-medium tracking-widest text-subtle uppercase">Your story</p>
                <p className="mt-2 text-base/6 font-semibold text-ink">{SAMPLE_STORY.title}</p>
                <p className="text-sm/6 text-subtle">{SAMPLE_STORY.place}</p>
              </div>
              <StarScript story={SAMPLE_STORY} />
            </li>
            <SampleQuestion index={2} />
          </ol>
        </div>
      </FolderCard>
    </section>
  );
}

function SampleQuestion({ index }: { index: number }) {
  const item = SAMPLE_QUESTIONS[index];
  if (!item) return null;
  return (
    <li className="flex flex-col gap-2">
      <Speaker meta={`Question ${index + 1} of ${SAMPLE_QUESTIONS.length}`} />
      <div className="rounded-2xl rounded-tl-sm bg-surface-muted p-5 sm:p-6">
        <p className="font-display text-2xl/8 font-normal text-pretty text-ink">“{item.question}”</p>
        <p className="mt-3 text-sm/6 text-muted">
          <span className="font-medium text-ink">What they&apos;re checking: </span>
          {item.checking}
        </p>
      </div>
    </li>
  );
}
