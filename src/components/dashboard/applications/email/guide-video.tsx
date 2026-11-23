"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

// A real screen recording can replace these three files under the same names.
export const GMAIL_GUIDE = "/guides/gmail-forwarding";

const REDUCE = "(prefers-reduced-motion: reduce)";

function subscribe(notify: () => void) {
  const query = window.matchMedia(REDUCE);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

const reduced = () => window.matchMedia(REDUCE).matches;

// A short silent loop of the Gmail steps: it loads once in view, plays only there, and waits for Play with reduced motion.
export function GuideVideo({ src = GMAIL_GUIDE }: { src?: string }) {
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
        width={960}
        height={600}
        className="block aspect-8/5 h-auto w-full"
      >
        {seen ? (
          <>
            <source src={`${src}.webm`} type="video/webm" />
            <source src={`${src}.mp4`} type="video/mp4" />
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
