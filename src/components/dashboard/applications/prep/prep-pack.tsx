"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { toast } from "@/components/ui/toast";
import type { InterviewPrep, PrepTarget, StarStory } from "@/lib/insights/prep";
import { prepToText, splitBlanks } from "@/lib/insights/prep-view";

const STAR_PARTS: { key: keyof Pick<StarStory, "situation" | "task" | "action" | "result">; label: string }[] = [
  { key: "situation", label: "Situation" },
  { key: "task", label: "Task" },
  { key: "action", label: "Action" },
  { key: "result", label: "Result" },
];

// A [blank] reads as a gap to fill in: a quiet fill, no status color, since nothing is wrong yet.
function WithBlanks({ text }: { text: string }) {
  return (
    <>
      {splitBlanks(text).map((part, index) =>
        part.blank ? (
          <span key={index} className="rounded-md bg-surface-muted px-1 text-ink">
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function PrepPack({ prep, target }: { prep: InterviewPrep; target: PrepTarget }) {
  async function copyAll() {
    try {
      await navigator.clipboard.writeText(prepToText(prep, target));
      toast({ title: "Copied", description: "Your prep is on the clipboard." });
    } catch {
      toast({ title: "Couldn't copy", description: "Select the text and copy it instead.", variant: "error" });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <FolderCard
        tab="Likely questions"
        tabEnd={
          <Button variant="ghost" size="sm" onClick={() => void copyAll()}>
            <Copy aria-hidden />
            Copy all
          </Button>
        }
        bodyClassName="px-4 py-0 sm:px-6"
      >
        {prep.questions.length > 0 ? (
          <ol className="divide-y divide-border">
            {prep.questions.map((item, index) => (
              <li key={item.question} className="flex gap-3 py-4">
                <span className="w-5 shrink-0 text-sm/6 text-subtle tabular-nums">{index + 1}</span>
                <div className="min-w-0">
                  <p className="text-base/6 font-medium text-pretty text-ink">{item.question}</p>
                  {item.why ? <p className="mt-1 text-sm/6 text-muted">{item.why}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-5 text-sm/6 text-muted">No questions this time. Try making a new pack.</p>
        )}
      </FolderCard>

      <FolderCard tab="Your stories" tone="lavender" bodyClassName="px-4 py-0 sm:px-6">
        {prep.stories.length > 0 ? (
          <ul className="divide-y divide-border">
            {prep.stories.map((story) => (
              <li key={story.line} className="py-5">
                <h3 className="text-base/6 font-medium text-ink">{story.title}</h3>
                <p className="mt-1 text-sm/6 text-muted">
                  From your line “{story.line}”
                  {story.place ? <span className="text-subtle"> · {story.place}</span> : null}
                </p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  {STAR_PARTS.map(({ key, label }) => (
                    <div key={key} className="min-w-0">
                      <dt className="text-xs/4 font-medium tracking-widest text-subtle uppercase">{label}</dt>
                      <dd className="mt-1 text-sm/6 text-pretty text-ink">
                        <WithBlanks text={story[key]} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-5 text-sm/6 text-muted">
            Your resume has no lines to build stories from yet. Add a few, then make a new pack.
          </p>
        )}
      </FolderCard>

      <FolderCard tab="Questions to ask them" bodyClassName="px-4 py-0 sm:px-6">
        {prep.asks.length > 0 ? (
          <ul className="divide-y divide-border">
            {prep.asks.map((ask) => (
              <li key={ask} className="py-4 text-base/6 text-pretty text-ink">
                {ask}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-5 text-sm/6 text-muted">No questions this time.</p>
        )}
      </FolderCard>
    </div>
  );
}
