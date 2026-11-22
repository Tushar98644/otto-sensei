"use client";

import { Download } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Otto } from "@/components/mascot/otto";
import { Button, buttonClasses } from "@/components/ui/button";
import type { Recap } from "@/lib/recap/types";

type Image = { url: string; names: boolean };

function firstFamily(element: Element | null, fallback: string): string {
  const list = element ? getComputedStyle(element).fontFamily : "";
  return list.split(",")[0]?.replace(/["']/g, "").trim() || fallback;
}

// Made in this browser from the numbers already on screen; names only when ticked.
export function RecapImagePanel({ recap, onBack }: { recap: Recap; onBack: () => void }) {
  const [names, setNames] = useState(false);
  const [image, setImage] = useState<Image | null>(null);
  const [failed, setFailed] = useState(false);
  const ottoRef = useRef<HTMLSpanElement>(null);
  const serifRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const checkId = useId();
  const hasNames = recap.momentum.moves.length > 0 || recap.jobs?.best != null;

  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;
    import("./save-image")
      .then(({ drawRecapImage }) =>
        drawRecapImage({
          recap,
          names,
          otto: ottoRef.current?.querySelector("svg") ?? null,
          display: firstFamily(serifRef.current, "Georgia"),
          sans: firstFamily(document.body, "system-ui"),
        }),
      )
      .then((blob) => {
        made = URL.createObjectURL(blob);
        if (cancelled) URL.revokeObjectURL(made);
        else setImage({ url: made, names });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [recap, names]);

  return (
    <div ref={panelRef} data-recap-keep className="mt-auto flex flex-col gap-4 pt-8">
      <span ref={ottoRef} aria-hidden className="hidden">
        <Otto pose="cheer" size={300} animated={false} />
      </span>
      <span ref={serifRef} aria-hidden className="hidden font-display" />
      <div className="flex items-start gap-4">
        <div className="aspect-[9/16] w-28 shrink-0 overflow-hidden rounded-xl bg-surface-muted shadow-page sm:w-32">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- a blob made in this browser
            <img src={image.url} alt="Preview of the image" className="size-full object-cover" />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-base/6 font-medium text-ink">Save your week as an image</p>
          <p className="text-sm/5 text-pretty text-muted">
            {failed
              ? "This browser couldn't draw the image."
              : "1080 × 1920, made here in your browser. Only numbers unless you add names."}
          </p>
          {hasNames ? (
            <label htmlFor={checkId} className="flex items-center gap-2 text-sm/5 text-ink">
              <input
                id={checkId}
                type="checkbox"
                checked={names}
                onChange={(event) => setNames(event.target.checked)}
                className="size-4 accent-ink"
              />
              Include names
            </label>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        {image && image.names === names ? (
          <a href={image.url} download={`otto-week-${recap.week}.png`} className={buttonClasses()}>
            <Download aria-hidden />
            Download image
          </a>
        ) : (
          <Button disabled loading={!failed}>
            <Download aria-hidden />
            Download image
          </Button>
        )}
      </div>
    </div>
  );
}
