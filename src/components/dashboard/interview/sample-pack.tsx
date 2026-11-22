import { useId } from "react";
import { QuestionCard } from "@/components/dashboard/applications/prep/prep-question";
import { StoryCard } from "@/components/dashboard/applications/prep/prep-story";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { PrepQuestion, StarStory } from "@/lib/insights/prep";

// Written by hand for the Jordan Ellis sample resume (lib/resume/sample.ts), so every fact is one of its lines.
const SAMPLE_JOB = "Senior Product Marketing Manager";
const STORY_ID = "sample-story-1";

const SAMPLE_QUESTIONS: readonly PrepQuestion[] = [
  {
    round: "opening",
    question: "Walk me through your background and what brought you to product marketing.",
    checking: "That you can tell a short, clear story about your path and land it on this job.",
    followUp: "What made you start looking for a new role now?",
    points: ["Start with where you are now: Brightloop", "End on why this job is the next step"],
    story: null,
  },
  {
    round: "behavioural",
    question: "Tell me about a launch you led. What did you do, and what changed?",
    checking: "That you can own a launch from start to finish and show the result in numbers.",
    followUp: "What would you do differently next time?",
    points: [
      "Say what the launch had to prove",
      "Spend most of the time on what you did",
      "Land on the numbers",
    ],
    story: 0,
  },
  {
    round: "skills",
    question: "How have you used pricing or messaging to move a number?",
    checking: "How you work with other teams and measure what your work changed.",
    followUp: "",
    points: ["Pick one place on your resume where you did this", "[What changed because of it?]"],
    story: null,
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
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <Eyebrow>Example prep pack</Eyebrow>
          <h2
            id={headingId}
            className="mt-1 font-display text-3xl/9 font-normal tracking-tight text-pretty text-ink"
          >
            Prep for {SAMPLE_JOB}
          </h2>
          <p className="mt-1 max-w-prose text-sm/6 text-pretty text-muted">
            Likely questions round by round, and stories outlined from the resume&apos;s own lines.
          </p>
        </div>
        <p className="text-xs/5 text-subtle">Jordan Ellis, a sample resume</p>
      </div>
      <div className="flex flex-col gap-10 mask-b-from-70%">
        <ol className="flex flex-col gap-5">
          {SAMPLE_QUESTIONS.map((item, index) => (
            <QuestionCard
              key={item.question}
              item={item}
              number={index + 1}
              total={SAMPLE_QUESTIONS.length}
              story={item.story === null ? null : { story: SAMPLE_STORY, href: `#${STORY_ID}` }}
            />
          ))}
        </ol>
        <StoryCard story={SAMPLE_STORY} index={0} id={STORY_ID} uses={[2]} />
      </div>
    </section>
  );
}
