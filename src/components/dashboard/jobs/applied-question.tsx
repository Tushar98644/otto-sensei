"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Button } from "@/components/ui/button";
import type { AskedAppliedAnswer } from "@/lib/job-feed/types";
import { cn } from "@/lib/utils";
import { promptAnnouncement, stripLine, type OpenedJob } from "./applied-prompt";

// "Applied to <company>?" after someone comes back from a job's own post: a question on that
// job's card, or one strip above the list for jobs not on this page. Never a dialog, never a
// toast, and never something that jumps under the pointer: both slide open by their own height.

// Opens and shuts by its own height, so whatever sits below moves gently instead of jumping. Shut,
// it takes no space and is inert. Reduced motion: the global rule makes it instant.
function Reveal({
  open,
  className,
  children,
}: {
  open: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

// Focus that is on its way to nowhere: on the page itself, or on a button that was just disabled
// (a "Yes" waiting on the tracker) or shut away with its question.
function focusLost(active: Element | null, box: HTMLElement | null): boolean {
  if (active === null || active === document.body) return true;
  if (!box?.contains(active)) return false;
  return active.closest("[inert]") !== null || (active as HTMLButtonElement).disabled === true;
}

/**
 * After an answer its buttons go away or wait. If focus was on them, it lands on `fallback`
 * instead of the top of the page. Only after an answer: a question that closes on its own, or
 * someone who already moved on, never has focus moved.
 */
function useFocusAfterAnswer(
  box: RefObject<HTMLElement | null>,
  fallback: () => HTMLElement | null | undefined,
) {
  const answered = useRef(false);
  useLayoutEffect(() => {
    if (!answered.current) return;
    const active = document.activeElement;
    if (focusLost(active, box.current)) {
      answered.current = false;
      fallback()?.focus();
    } else if (!box.current?.contains(active)) {
      answered.current = false;
    }
  });
  return () => {
    answered.current = true;
  };
}

/** The question at the foot of a job card. */
export function CardAppliedQuestion({
  open,
  company,
  logging,
  onAnswer,
  focusAfter,
}: {
  open: boolean;
  company: string;
  // "Yes" runs the card's "Mark applied", so it shares its spinner.
  logging: boolean;
  onAnswer: (answer: AskedAppliedAnswer) => void;
  focusAfter: RefObject<HTMLElement | null>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const answered = useFocusAfterAnswer(box, () => focusAfter.current);
  // Drawn from the first time it opens, so it can slide shut again; cards never asked stay empty.
  const [asked, setAsked] = useState(open);
  if (open && !asked) setAsked(true);

  function answer(value: AskedAppliedAnswer) {
    answered();
    onAnswer(value);
  }

  return (
    // The card's gap-4 is taken back while shut, so a card with no question keeps its height.
    // The extra px-1 and pb-1 inside leave room for the focus ring that overflow would clip.
    <Reveal open={open} className="-mx-1 -mt-4">
      {asked ? (
        <div ref={box} className="px-1 pt-4 pb-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4">
            <p className="text-sm/6 font-medium text-pretty text-ink">Applied to {company}?</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" loading={logging} onClick={() => answer("yes")}>
                <Check aria-hidden />
                Yes, I applied
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={logging}
                onClick={() => answer("not_yet")}
                className="text-muted hover:text-ink"
              >
                Not yet
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Reveal>
  );
}

function sameJobs(a: readonly OpenedJob[], b: readonly OpenedJob[]): boolean {
  return a.length === b.length && a.every((entry, index) => entry.jobId === b[index]?.jobId);
}

/** One slim strip above the list for opened jobs that have no card on this page. */
export function AppliedStrip({
  jobs,
  loggingId,
  onAnswer,
  focusAfter,
}: {
  jobs: readonly OpenedJob[];
  loggingId: string | null;
  onAnswer: (job: OpenedJob, answer: AskedAppliedAnswer) => void;
  // Where focus goes when the last one is answered and the strip closes.
  focusAfter: RefObject<HTMLElement | null>;
}) {
  const [expanded, setExpanded] = useState(false);
  // The last jobs shown, so the strip keeps its words while it slides shut.
  const [shown, setShown] = useState(jobs);
  if (jobs.length > 0 && !sameJobs(jobs, shown)) setShown(jobs);
  const open = jobs.length > 0;
  const list = open ? jobs : shown;

  const box = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const answered = useFocusAfterAnswer(box, () => (open ? toggle.current : focusAfter.current));

  function answer(job: OpenedJob, value: AskedAppliedAnswer) {
    answered();
    onAnswer(job, value);
  }

  return (
    // Sits in the list's gap-4 column: the gap below is taken back while shut.
    <Reveal open={open} className="-mb-4">
      <div ref={box} className="pb-4">
        <section aria-label="Jobs you opened" className="rounded-2xl bg-surface px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm/6 font-medium text-pretty text-ink">{stripLine(list.length)}</p>
            <Button
              ref={toggle}
              variant="ghost"
              size="sm"
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={() => setExpanded((value) => !value)}
              className="-mr-2 text-muted hover:text-ink"
            >
              {expanded ? "Hide jobs" : "Show jobs"}
              <ChevronDown
                aria-hidden
                className={cn("transition-transform duration-200", expanded && "rotate-180")}
              />
            </Button>
          </div>
          <Reveal open={expanded}>
            <ul id={listId} className="mt-2 divide-y divide-border border-t border-border">
              {list.map((job) => (
                <li
                  key={job.jobId}
                  className="flex flex-col gap-2 py-3 last:pb-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <p className="min-w-0 text-sm/6 text-pretty">
                    <span className="font-medium text-ink">{job.company}</span>
                    <span className="text-muted"> · {job.title}</span>
                  </p>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={loggingId === job.jobId}
                      onClick={() => answer(job, "yes")}
                    >
                      <Check aria-hidden />
                      Yes, I applied
                      <span className="sr-only"> to {job.company}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loggingId === job.jobId}
                      onClick={() => answer(job, "not_yet")}
                      className="text-muted hover:text-ink"
                    >
                      Not yet
                      <span className="sr-only">, {job.company}</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      </div>
    </Reveal>
  );
}

/**
 * Says new questions out loud, politely, once each: the cards and the strip are in the page, not
 * live regions, so answering one never re-reads the rest.
 */
export function AppliedAnnouncer({
  onCard,
  offPage,
}: {
  onCard: readonly OpenedJob[];
  offPage: readonly OpenedJob[];
}) {
  const live = useRef<HTMLParagraphElement>(null);
  const heard = useRef<ReadonlySet<string>>(new Set());
  const key = [...onCard, ...offPage].map((entry) => entry.jobId).join(" ");

  useEffect(() => {
    const ids = new Set(key ? key.split(" ") : []);
    const fresh = (entry: OpenedJob) => !heard.current.has(entry.jobId);
    const newOnCard = onCard.filter(fresh);
    const newOffPage = offPage.some(fresh);
    heard.current = ids;
    if (!live.current || (newOnCard.length === 0 && !newOffPage)) return;
    live.current.textContent = promptAnnouncement(newOnCard, newOffPage ? offPage.length : 0);
    // Only the key decides: a re-render with the same questions says nothing again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <p ref={live} aria-live="polite" className="sr-only" />;
}
