import { ArrowDown, ChevronDown, CornerDownRight } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import type { PrepQuestion, StarStory } from "@/lib/insights/prep";
import { pluralize } from "@/lib/utils";
import { Speaker, WithBlanks } from "./speech";

export type LinkedStory = { story: StarStory; href: string };

export function storyHref(index: number): string {
  return `#prep-story-${index + 1}`;
}

function Note({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs/4 font-medium tracking-widest text-subtle uppercase">{label}</p>
      {children}
    </div>
  );
}

export function AnswerNotes({ item, story }: { item: PrepQuestion; story: LinkedStory | null }) {
  return (
    <>
      {item.checking ? (
        <Note label="What they're checking">
          <p className="text-base/7 text-pretty text-ink">{item.checking}</p>
        </Note>
      ) : null}
      {item.points.length > 0 ? (
        <Note label="Hit these points">
          <ul className="flex flex-col gap-1.5">
            {item.points.map((point) => (
              <li key={point} className="flex gap-3 text-base/7 text-pretty text-ink">
                <span aria-hidden className="mt-3 size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0">
                  <WithBlanks text={point} />
                </span>
              </li>
            ))}
          </ul>
        </Note>
      ) : null}
      {story ? (
        <Note label="Use your story">
          <a
            href={story.href}
            className={buttonClasses({
              variant: "secondary",
              size: "sm",
              className: "h-auto min-h-9 w-fit max-w-full py-1.5 whitespace-normal",
            })}
          >
            <span className="text-left">{story.story.title}</span>
            <ArrowDown aria-hidden className="text-muted" />
          </a>
        </Note>
      ) : null}
      {item.followUp ? (
        <Note label="Likely follow-up">
          <p className="flex gap-2 text-base/7 text-pretty text-ink">
            <CornerDownRight aria-hidden className="mt-1.5 size-4 shrink-0 text-muted" />
            <span>“{item.followUp}”</span>
          </p>
        </Note>
      ) : null}
    </>
  );
}

export function hasNotes(item: PrepQuestion, story: LinkedStory | null): boolean {
  return Boolean(item.checking || item.points.length > 0 || story || item.followUp);
}

// How to answer is folded under, so the page reads as the interview first and the prep second.
export function QuestionCard({
  item,
  number,
  total,
  story,
}: {
  item: PrepQuestion;
  number: number;
  total: number;
  story: LinkedStory | null;
}) {
  const inside = [
    item.points.length > 0 ? pluralize(item.points.length, "point") : "",
    story ? "your story" : "",
    item.followUp ? "follow-up" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="flex flex-col gap-2">
      <Speaker meta={`Question ${number} of ${total}`} />
      <div className="rounded-2xl rounded-tl-sm bg-surface">
        <h4 className="px-5 pt-5 pb-5 font-display text-2xl/8 font-normal text-pretty text-ink sm:px-6 sm:pt-6">
          “{item.question}”
        </h4>
        {hasNotes(item, story) ? (
          <details className="group/notes border-t border-border">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-b-2xl px-5 text-sm font-medium whitespace-nowrap text-ink hover:bg-ink/3 group-open/notes:rounded-none sm:px-6 [&::-webkit-details-marker]:hidden">
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-muted transition-transform group-open/notes:rotate-180"
              />
              How to answer
              {inside ? (
                <span className="ml-auto hidden truncate pl-2 text-xs/5 font-normal text-subtle sm:block">
                  {inside}
                </span>
              ) : null}
            </summary>
            <div className="flex flex-col gap-5 px-5 pt-2 pb-6 sm:px-6">
              <AnswerNotes item={item} story={story} />
            </div>
          </details>
        ) : null}
      </div>
    </li>
  );
}
