import { Arrow, Bubble } from "@/components/doodles/doodles";
import { Otto } from "@/components/mascot/otto";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatBytes } from "@/components/ui/file-check";
import { LivePill } from "@/components/ui/live-pill";
import { Panel, Window } from "@/components/ui/panel";
import { UPLOAD_LIMITS } from "@/config/plans";
import { fmt } from "@/i18n/format";
import { HeroDemoViews } from "./hero-demo-views";
import type { HomeMessages } from "./home-copy";
import { HomeDropCue } from "./home-upload";
import { DEMO_FILE_NAME, demoPerson, parsedLines, type ParsedSegment } from "./recruiter-demo-data";
import { ResumeMock } from "./resume-mock";
import { MomentCaption } from "./section";

const LINE_STEP_MS = 60;

export function HeroDemo({ t, className }: { t: HomeMessages; className?: string }) {
  const demo = t.demo;
  const person = demoPerson(t.resume);
  const lines = parsedLines(person, t.resume);
  const highlightAt = lines.length * LINE_STEP_MS + 150;
  return (
    <figure className={className}>
      <Panel className="relative pb-8 sm:pb-10 lg:pt-8">
        <HeroDemoViews
          copy={demo.views}
          see={
            <>
              <Eyebrow className="max-sm:sr-only">{demo.see}</Eyebrow>
              <ResumeMock t={t.resume} person={person} className="-rotate-1 sm:mt-3" />
            </>
          }
          reads={
            <>
              <Eyebrow className="max-sm:sr-only">{demo.reads}</Eyebrow>
              <div className="relative sm:mt-3">
                <Otto
                  pose="peek"
                  size={128}
                  title={demo.otto}
                  className="absolute -top-11 right-4 z-10 size-20 motion-safe:animate-otto-peek sm:-top-18 sm:right-8 sm:size-32"
                />
                <Window title={DEMO_FILE_NAME} meta={demo.plainText}>
                  <ParsedText
                    lines={lines}
                    marked={new Set(person.skills)}
                    highlightAt={highlightAt}
                  />
                </Window>
                <LivePill
                  announce={false}
                  style={{ animationDelay: `${highlightAt + 350}ms` }}
                  className="absolute right-6 -bottom-4"
                >
                  {demo.mixed}
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
        <HomeDropCue
          copy={{
            drop: t.upload.drop,
            formats: fmt(t.upload.formats, { size: formatBytes(UPLOAD_LIMITS.maxBytes) }),
          }}
        />
      </Panel>
      <figcaption>
        <MomentCaption title={demo.captionTitle}>{demo.caption}</MomentCaption>
      </figcaption>
    </figure>
  );
}

function ParsedText({
  lines,
  marked,
  highlightAt,
}: {
  lines: readonly ParsedSegment[][];
  marked: ReadonlySet<string>;
  highlightAt: number;
}) {
  return (
    <pre className="px-4 py-4 font-mono text-xs/6 wrap-break-word whitespace-pre-wrap text-ink sm:px-5 sm:text-sm/7">
      {lines.map((line, row) => (
        <span
          key={row}
          className="block motion-safe:animate-fade-in"
          style={{ animationDelay: `${row * LINE_STEP_MS}ms` }}
        >
          {line.map((segment, i) =>
            segment.kind === "column" && marked.has(segment.text) ? (
              <mark
                key={i}
                className="highlighter text-ink motion-safe:animate-highlight-in"
                style={{ animationDelay: `${highlightAt}ms` }}
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
