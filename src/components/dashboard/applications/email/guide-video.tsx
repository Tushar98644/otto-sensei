"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

// A real screen recording can replace these three files under the same names.
export const GMAIL_GUIDE = "/guides/gmail-forwarding";
export const GMAIL_FILTER_GUIDE = "/guides/gmail-filter";
// The real Applications board as three hiring emails arrive, for the home page.
export const EMAIL_BOARD_CLIP = "/guides/email-board";
// The real Jobs page as a new role reloads the matches, for the home page.
export const JOBS_CLIP = "/guides/jobs-board";
// A real Interview prep pack: questions, a story, the craft round and practice, for the home page.
export const INTERVIEW_CLIP = "/guides/interview-prep";

const REDUCE = "(prefers-reduced-motion: reduce)";

function subscribe(notify: () => void) {
  const query = window.matchMedia(REDUCE);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

const reduced = () => window.matchMedia(REDUCE).matches;

// A short silent loop of the Gmail steps: it loads once in view, plays only there, and waits for Play with reduced motion.
export function GuideVideo({
  src = GMAIL_GUIDE,
  width = 960,
  height = 600,
}: {
  src?: string;
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const still = useSyncExternalStore(subscribe, reduced, () => true);
  const [choice, setChoice] = useState<boolean | null>(null);
  const [seen, setSeen] = useState(false);
  const [inView, setInView] = useState(false);
  const playing = choice ?? !still;

  useEffect(() => {
    const video = ref.current;
    if (!video || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry?.isIntersecting ?? false;
        setInView(visible);
        if (visible) setSeen(true);
      },
      { rootMargin: "200px" },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video || !seen) return;
    if (playing && inView) void video.play().catch(() => {});
    else video.pause();
  }, [seen, playing, inView]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-muted ring-1 ring-ink/6">
      <video
        ref={ref}
        aria-hidden
        muted
        loop
        playsInline
        preload={seen && playing ? "auto" : "none"}
        poster={`${src}.jpg`}
        width={width}
        height={height}
        style={{ aspectRatio: `${width} / ${height}` }}
        className="block h-auto w-full"
      >
        {seen ? (
          <>
            <source src={`${src}.mp4`} type="video/mp4" />
            <source src={`${src}.webm`} type="video/webm" />
          </>
        ) : null}
      </video>
      {playing ? (
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label="Pause"
          onClick={() => setChoice(false)}
          className="absolute right-2 bottom-2"
        >
          <Pause aria-hidden />
        </Button>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button variant="secondary" onClick={() => setChoice(true)}>
            <Play aria-hidden />
            Play
          </Button>
        </div>
      )}
    </div>
  );
}
