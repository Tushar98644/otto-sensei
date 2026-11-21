"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { TemplateTheme } from "@/components/pdf/theme";
import { PDF_FONT_FAMILIES, isPdfFont, type PdfFontName } from "@/lib/pdf/fonts";

const requested = new Set<PdfFontName>();
const listeners = new Set<() => void>();
let loadedCount = 0;

export function themeFonts(theme: TemplateTheme): PdfFontName[] {
  const names = new Set<PdfFontName>();
  for (const style of Object.values(theme.styles)) {
    const family: unknown = style?.fontFamily;
    for (const name of Array.isArray(family) ? family : [family]) {
      if (isPdfFont(name)) names.add(name);
    }
  }
  return [...names].sort();
}

function load(name: PdfFontName) {
  if (requested.has(name) || typeof FontFace === "undefined") return;
  requested.add(name);
  const family = PDF_FONT_FAMILIES[name];
  const faces = family.faces.map((face) =>
    new FontFace(name, `url(/fonts/pdf/${family.dir}/${face.file})`, {
      weight: String(face.weight),
      style: face.style,
    })
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
      }),
  );
  void Promise.allSettled(faces).then(() => {
    loadedCount += 1;
    for (const listener of listeners) listener();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The PDF's own faces, so the preview wraps lines where the PDF does; it re-measures as each family lands.
export function usePdfFonts(theme: TemplateTheme): number {
  const names = themeFonts(theme).join("|");
  useEffect(() => {
    for (const name of names.split("|")) if (isPdfFont(name)) load(name);
  }, [names]);
  return useSyncExternalStore(
    subscribe,
    () => loadedCount,
    () => 0,
  );
}
