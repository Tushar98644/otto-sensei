import { Arrow, Bubble } from "@/components/doodles/doodles";
import { Otto } from "@/components/mascot/otto";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LivePill } from "@/components/ui/live-pill";
import { Panel, Window } from "@/components/ui/panel";
import { DEMO_FILE_NAME, DEMO_PERSON, PARSED_LINES } from "./recruiter-demo-data";
import { ResumeMock } from "./resume-mock";
import { MomentCaption } from "./section";

// It plays once on load and then sits still: lines appear 60ms apart, the highlights paint over
// the skills that landed inside job lines, then the pill names the problem (about 1.2s in all).
const LINE_STEP_MS = 60;
const HIGHLIGHT_AT_MS = PARSED_LINES.length * LINE_STEP_MS + 150;
const PILL_AT_MS = HIGHLIGHT_AT_MS + 350;

// Only the skills get marked: they are what the pill names, and more than three marks in one
// window stop reading as a pen and start reading as noise. The rest of the scramble shows itself.
const MARKED = new Set<string>(DEMO_PERSON.skills);

// The "aha": the same resume as a person sees it and as hiring software reads it.
export function HeroDemo({ className }: { className?: string }) {
  return (
    <figure className={className}>
      <Panel className="pb-8 sm:pb-10 lg:pt-8">
        <div className="relative grid gap-6 lg:grid-cols-2 lg:gap-16">
          <div className="max-sm:hidden">
            <Eyebrow>What you see</Eyebrow>
            <ResumeMock className="mt-3 -rotate-1" />
          </div>

          <div>
            <Eyebrow>What hiring software reads</Eyebrow>
            <div className="relative mt-3">
              {/* Paws on the window's top edge: PEEK_EDGE_Y (112 of 200) of his height sits above
                  it, so the offset is 56% of his size (45px of 80, 72px of 128). */}
              <Otto
                pose="peek"
                size={128}
                title="Otto the otter, peeking over the window"
                className="absolute -top-11 right-4 z-10 size-20 motion-safe:animate-otto-peek sm:-top-18 sm:right-8 sm:size-32"
              />
              <Window title={DEMO_FILE_NAME} meta="Plain text">
                <ParsedText />
              </Window>
              <LivePill
                announce={false}
                style={{ animationDelay: `${PILL_AT_MS}ms` }}
                className="absolute right-6 -bottom-4"
              >
                Skills mixed into jobs
              </LivePill>
            </div>
          </div>

          <Arrow className="absolute top-1/3 left-1/2 w-16 -translate-x-1/2 text-ink max-lg:hidden" />
          <Bubble
            fillClassName="fill-surface-muted"
            className="absolute bottom-10 left-1/2 w-14 -translate-x-1/2 text-ink max-lg:hidden"
          />
        </div>
      </Panel>
      <figcaption>
        <MomentCaption title="Example resume">
          Columns look sharp to people. Software reads straight across them.
        </MomentCaption>
      </figcaption>
    </figure>
  );
}

function ParsedText() {
  return (
    <pre className="px-4 py-4 font-mono text-xs/6 wrap-break-word whitespace-pre-wrap text-ink sm:px-5 sm:text-sm/7">
      {PARSED_LINES.map((line, row) => (
        // Fixed demo content, so a line's position is a stable key.
        <span
          key={row}
          className="block motion-safe:animate-fade-in"
          style={{ animationDelay: `${row * LINE_STEP_MS}ms` }}
        >
          {line.map((segment, i) =>
            segment.kind === "column" && MARKED.has(segment.text) ? (
              <mark
                key={i}
                className="highlighter text-ink motion-safe:animate-highlight-in"
                style={{ animationDelay: `${HIGHLIGHT_AT_MS}ms` }}
              >
                {segment.text}
              </mark>
            ) : (
              <span key={i}>{segment.text}</span>
            ),
          )}
        </span>
      ))}
    </pre>
  );
}
