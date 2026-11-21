"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { preloadFormatPreview } from "@/components/formats/format-image";
import { FormatPreviewDialog } from "@/components/formats/format-preview-dialog";
import { ROUTES } from "@/components/site/routes";
import { Button } from "@/components/ui/button";
import type { TemplateInfo } from "@/lib/pdf/templates";
import type { TemplateId } from "@/lib/resume/schema";

const loadOpener = () => import("./open-format");

let previewing: TemplateId | null = null;
const previewListeners = new Set<() => void>();

function showPreview(id: TemplateId | null) {
  previewing = id;
  for (const listener of previewListeners) listener();
}

function subscribePreview(listener: () => void) {
  previewListeners.add(listener);
  return () => {
    previewListeners.delete(listener);
  };
}

// The studio's store loads only on intent, so the gallery itself stays light.
function useOpenFormat() {
  const router = useRouter();
  const [opening, setOpening] = useState<TemplateId | null>(null);

  const prepare = useCallback(() => {
    router.prefetch(ROUTES.studio);
    void loadOpener().catch(() => undefined);
  }, [router]);

  async function open(id: TemplateId) {
    setOpening(id);
    try {
      const { openFormatInStudio } = await loadOpener();
      await openFormatInStudio(id);
      router.push(ROUTES.studio);
    } catch {
      window.location.assign(ROUTES.studio);
    }
  }

  return { opening, prepare, open };
}

export type UseFormatButtonProps = {
  id: TemplateId;
  name: string;
};

// Sits above the card-wide preview button, so it keeps its own clicks.
export function UseFormatButton({ id, name }: UseFormatButtonProps) {
  const { opening, prepare, open } = useOpenFormat();
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={opening === id}
      className="relative z-10 self-start"
      onPointerEnter={prepare}
      onFocus={prepare}
      onClick={() => void open(id)}
    >
      Use this format
      <span className="sr-only">: {name}</span>
      <ArrowRight />
    </Button>
  );
}

export type PreviewFormatButtonProps = {
  id: TemplateId;
  name: string;
  children: ReactNode;
};

// Its hit area stretches over the whole card (the nearest positioned parent).
export function PreviewFormatButton({ id, name, children }: PreviewFormatButtonProps) {
  const preload = () => preloadFormatPreview(id);
  return (
    <button
      type="button"
      aria-label={`See the full ${name} page`}
      aria-haspopup="dialog"
      onPointerEnter={preload}
      onFocus={preload}
      onClick={() => showPreview(id)}
      className="block w-full cursor-zoom-in text-left outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ink"
    >
      {children}
    </button>
  );
}

export type PreviewFormat = { info: TemplateInfo; pro: boolean };

export type FormatPreviewHostProps = {
  formats: readonly PreviewFormat[];
};

export function FormatPreviewHost({ formats }: FormatPreviewHostProps) {
  const id = useSyncExternalStore(
    subscribePreview,
    () => previewing,
    () => null,
  );
  const shown = formats.find((format) => format.info.id === id) ?? null;
  const { opening, prepare, open } = useOpenFormat();
  useEffect(() => {
    if (id) prepare();
  }, [id, prepare]);
  // Coming back to the page shouldn't reopen the preview it was left on.
  useEffect(() => () => showPreview(null), []);
  return (
    <FormatPreviewDialog
      info={shown?.info ?? null}
      pro={shown?.pro ?? false}
      onClose={() => showPreview(null)}
      actionLabel="Use this format"
      ready={opening === null}
      opening={opening !== null}
      onUse={(info) => void open(info.id)}
    />
  );
}
