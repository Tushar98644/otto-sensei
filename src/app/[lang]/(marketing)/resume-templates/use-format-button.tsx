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
import { fmt } from "@/i18n/format";

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
  label?: string;
};

// Sits above the card-wide preview button, so it keeps its own clicks.
export function UseFormatButton({ id, name, label = "Use this format" }: UseFormatButtonProps) {
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
      {label}
      <span className="sr-only">: {name}</span>
      <ArrowRight />
    </Button>
  );
}

export type PreviewFormatButtonProps = {
  id: TemplateId;
  name: string;
  // "See the full {name} page" in the page's language.
  label?: string;
  children: ReactNode;
};

// Its hit area stretches over the whole card (the nearest positioned parent).
export function PreviewFormatButton({
  id,
  name,
  label = "See the full {name} page",
  children,
}: PreviewFormatButtonProps) {
  const preload = () => preloadFormatPreview(id);
  return (
    <button
      type="button"
      aria-label={fmt(label, { name })}
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

export type PreviewFormat = { info: TemplateInfo; pro: boolean; description: string };

export type FormatPreviewLabels = { use: string; close: string; imageAlt: string; pro: string };

export type FormatPreviewHostProps = {
  formats: readonly PreviewFormat[];
  labels?: FormatPreviewLabels;
};

export function FormatPreviewHost({ formats, labels }: FormatPreviewHostProps) {
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
      actionLabel={labels?.use ?? "Use this format"}
      closeLabel={labels?.close}
      imageAlt={labels?.imageAlt}
      description={shown?.description}
      proLabel={labels?.pro}
      ready={opening === null}
      opening={opening !== null}
      onUse={(info) => void open(info.id)}
    />
  );
}
