import { FileText } from "lucide-react";
import { FolderCard } from "@/components/ui/folder-card";
import type { StarStory } from "@/lib/insights/prep";
import { cn } from "@/lib/utils";
import { WithBlanks } from "./speech";

type Part = keyof Pick<StarStory, "situation" | "task" | "action" | "result">;

const BEATS: { key: Part; letter: string; label: string; cue: string }[] = [
  { key: "situation", letter: "S", label: "Situation", cue: "Set the scene" },
  { key: "task", letter: "T", label: "Task", cue: "Your part" },
  { key: "action", letter: "A", label: "Action", cue: "What you did" },
  { key: "result", letter: "R", label: "Result", cue: "What changed" },
];

function joinNumbers(numbers: readonly number[]): string {
  if (numbers.length <= 1) return numbers.join("");
  return `${numbers.slice(0, -1).join(", ")} and ${numbers.at(-1)}`;
}

export function StarOutline({ story, className }: { story: StarStory; className?: string }) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {BEATS.map(({ key, letter, label, cue }, index) => (
        <li key={key} className="relative flex gap-3.5 pb-5 last:pb-0">
          {index < BEATS.length - 1 ? (
            <span aria-hidden className="absolute top-8 bottom-1 left-3.5 w-px bg-primary/15" />
          ) : null}
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/8 text-xs font-semibold text-primary ring-1 ring-primary/10"
          >
            {letter}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-xs/5 text-subtle">
              <span className="font-medium tracking-widest uppercase">{label}</span>
              <span aria-hidden> · </span>
              <span className="sr-only">, </span>
              {cue}
            </p>
            <p className="mt-0.5 text-base/7 text-pretty text-ink">
              <WithBlanks text={story[key]} />
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// The resume line the story grew from, shown as a strip of the page itself, highlighted.
export function ResumeSlip({
  line,
  place,
  className,
}: {
  line: string;
  place: string;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "rounded-xl bg-surface-muted p-3 sm:p-4 print:bg-transparent print:p-0",
        className,
      )}
    >
      <figcaption className="flex items-center gap-1.5 px-1 text-xs/4 font-medium tracking-widest text-subtle uppercase">
        <FileText aria-hidden className="size-3.5" />
        From your resume
      </figcaption>
      <div className="relative mt-2.5 rounded-xs bg-surface px-4 py-3.5 shadow-page sm:-rotate-[0.4deg] sm:px-5 print:rotate-0 print:shadow-none print:ring-1 print:ring-ink/15">
        {place ? <p className="text-xs/5 font-semibold text-ink">{place}</p> : null}
        <span
          aria-hidden
          className="mt-1.5 block h-1 w-11/12 rounded-full bg-surface-strong print:hidden"
        />
        <blockquote className="mt-1.5 flex gap-2 text-sm/6 text-pretty text-ink">
          <span aria-hidden className="mt-2.5 size-1 shrink-0 rounded-full bg-ink/50" />
          <p className="min-w-0">
            <span className="highlighter">{line}</span>
          </p>
        </blockquote>
        <span
          aria-hidden
          className="mt-1.5 block h-1 w-4/5 rounded-full bg-surface-strong print:hidden"
        />
      </div>
    </figure>
  );
}

export function StoryCard({
  story,
  index,
  id,
  uses,
}: {
  story: StarStory;
  index: number;
  id: string;
  uses: readonly number[];
}) {
  return (
    <FolderCard
      id={id}
      tabIndex={-1}
      tab={`Story ${index + 1}`}
      tabEnd={
        uses.length > 0 ? (
          <span className="text-xs/4 text-subtle">
            For {uses.length === 1 ? "question" : "questions"} {joinNumbers(uses)}
          </span>
        ) : null
      }
      className="scroll-mt-6 break-inside-avoid outline-none"
      bodyClassName="flex flex-col gap-6 p-5 sm:p-8 print:ring-1 print:ring-ink/15"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <h3 className="text-lg/7 font-medium tracking-tight text-pretty text-ink">
            {story.title}
          </h3>
          <p className="mt-1 text-sm/6 text-muted">A short answer built from one line you wrote.</p>
        </div>
        <ResumeSlip line={story.line} place={story.place} />
      </div>
      <div className="min-w-0">
        <p className="text-sm/5 font-medium text-ink">Say it like this</p>
        <StarOutline story={story} className="mt-4" />
      </div>
    </FolderCard>
  );
}
