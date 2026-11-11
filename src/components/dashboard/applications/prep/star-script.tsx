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

export function StarScript({ story, className }: { story: StarStory; className?: string }) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {BEATS.map(({ key, letter, label, cue }, index) => (
        <li key={key} className="relative flex gap-3 pb-5 last:pb-0">
          {index < BEATS.length - 1 ? (
            <span aria-hidden className="absolute top-8 bottom-1 left-3.5 w-px bg-border-strong/35" />
          ) : null}
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-ink ring-1 ring-border"
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
