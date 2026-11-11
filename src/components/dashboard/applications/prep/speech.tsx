import { UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { SpeechBubble } from "@/components/mascot/speech-bubble";
import { OttoMark } from "@/components/site/otto-mark";
import { splitBlanks } from "@/lib/insights/prep-view";
import { cn } from "@/lib/utils";

type AvatarSize = "md" | "lg";

const AVATAR: Record<AvatarSize, { box: string; icon: string }> = {
  md: { box: "size-8", icon: "size-6" },
  lg: { box: "size-12", icon: "size-9" },
};

// Otto plays the interviewer, so his head is the interviewer's face.
export function InterviewerAvatar({ size = "md" }: { size?: AvatarSize }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-border",
        AVATAR[size].box,
      )}
    >
      <OttoMark className={AVATAR[size].icon} />
    </span>
  );
}

// Who is talking, over a line of the interview: "Interviewer · Question 3 of 8".
export function Speaker({
  meta,
  size = "md",
  className,
}: {
  meta?: ReactNode;
  size?: AvatarSize;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <InterviewerAvatar size={size} />
      <p className="text-sm/5 text-subtle">
        <span className="font-medium text-ink">Interviewer</span>
        {meta ? <> · {meta}</> : null}
      </p>
    </div>
  );
}

// The person's own questions: their side of the talk, so on the right under their avatar.
export function AskBubbles({
  asks,
  surface = "mist",
  className,
}: {
  asks: readonly string[];
  surface?: "mist" | "paper";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-end gap-2", className)}>
      <div className="flex items-center gap-2.5">
        <p className="text-sm/5 font-medium text-ink">You</p>
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white"
        >
          <UserRound className="size-4" />
        </span>
      </div>
      {/* Inset on phones too, so the bubbles still read as the right-hand side of the talk. */}
      <ul className="flex w-full flex-col items-end gap-2 pl-10 sm:pl-16">
        {asks.map((ask) => (
          <li key={ask} className="flex max-w-xl justify-end">
            <SpeechBubble className={cn("rounded-tr-sm", surface === "mist" && "bg-surface")}>{ask}</SpeechBubble>
          </li>
        ))}
      </ul>
    </div>
  );
}

// A [blank] is a gap to fill in: dashed outline, muted text so it never passes for a fact.
export function WithBlanks({ text }: { text: string }) {
  return (
    <>
      {splitBlanks(text).map((part, index) =>
        part.blank ? (
          <span
            key={index}
            className="rounded-md border border-dashed border-border-strong px-1 text-muted box-decoration-clone"
          >
            <span className="sr-only">Fill in: </span>
            {part.text.slice(1, -1)}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
