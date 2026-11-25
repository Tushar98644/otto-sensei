import { Arrow, Bubble } from "@/components/doodles/doodles";
import { Otto } from "@/components/mascot/otto";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LivePill } from "@/components/ui/live-pill";
import { Panel, Window } from "@/components/ui/panel";
import { HeroDemoViews } from "./hero-demo-views";
import { HomeDropCue } from "./home-upload";
import { DEMO_FILE_NAME, DEMO_PERSON, PARSED_LINES } from "./recruiter-demo-data";
import { ResumeMock } from "./resume-mock";
import { MomentCaption } from "./section";

const LINE_STEP_MS = 60;
const HIGHLIGHT_AT_MS = PARSED_LINES.length * LINE_STEP_MS + 150;
const PILL_AT_MS = HIGHLIGHT_AT_MS + 350;

const MARKED = new Set<string>(DEMO_PERSON.skills);

export function HeroDemo({ className }: { className?: string }) {
  return (
    <figure className={className}>
      <Panel className="relative pb-8 sm:pb-10 lg:pt-8">
        <HeroDemoViews
          see={
            <>
              <Eyebrow className="max-sm:sr-only">What you see</Eyebrow>
              <ResumeMock className="-rotate-1 sm:mt-3" />
            </>
          }
          reads={
            <>
              <Eyebrow className="max-sm:sr-only">What hiring software reads</Eyebrow>
              <div className="relative sm:mt-3">
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
            </>
          }
        >
          <Arrow className="absolute top-1/3 left-1/2 w-16 -translate-x-1/2 text-ink max-lg:hidden" />
          <Bubble
            fillClassName="fill-surface-muted"
            className="absolute bottom-10 left-1/2 w-14 -translate-x-1/2 text-ink max-lg:hidden"
          />
        </HeroDemoViews>
        <HomeDropCue />
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
