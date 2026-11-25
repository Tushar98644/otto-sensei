"use client";

import { useEffect, useState } from "react";
import type { HintProps, LanguageHint } from "./language-hint";

// The hint only ever shows when the browser's first language we have isn't English (matchLocale reads languages alike).
function prefersAnotherLanguage({ languages }: HintProps["links"]): boolean {
  const ours = new Set(languages.map(({ locale }) => locale.split("-")[0]?.toLowerCase()));
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    const language = tag.trim().split(/[-_]/)[0]?.toLowerCase();
    if (language && ours.has(language)) return language !== "en";
  }
  return false;
}

// Fetches the hint after the page settles, and only for browsers it could speak to.
export function LanguageHintLoader(props: HintProps) {
  const [Hint, setHint] = useState<typeof LanguageHint | null>(null);
  useEffect(() => {
    if (!prefersAnotherLanguage(props.links)) return;
    let live = true;
    const load = () => {
      import("./language-hint").then(
        (module) => {
          if (live) setHint(() => module.LanguageHint);
        },
        () => {},
      );
    };
    const idle = typeof window.requestIdleCallback === "function";
    const id = idle
      ? window.requestIdleCallback(load, { timeout: 3000 })
      : window.setTimeout(load, 1);
    return () => {
      live = false;
      if (idle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [props.links]);
  return Hint ? <Hint {...props} /> : null;
}
