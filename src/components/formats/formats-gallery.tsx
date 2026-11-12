"use client";

import { useEffect, useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { resumeLabel } from "@/components/studio/resume-label";
import { isProTemplate, TEMPLATE_INFO, TEMPLATE_LIST, templateOf } from "@/lib/pdf/templates";
import type { TemplateId } from "@/lib/resume/schema";
import { FormatCard } from "./format-card";
import { preloadFormatPreview } from "./format-image";
import { FormatPreviewDialog } from "./format-preview-dialog";
import { useApplyFormat } from "./use-apply-format";

function preloadAllPreviews(): void {
  for (const info of TEMPLATE_LIST) preloadFormatPreview(info.id);
}

function usePreloadPreviewsWhenIdle(): void {
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const handle = requestIdleCallback(preloadAllPreviews, { timeout: 2000 });
      return () => cancelIdleCallback(handle);
    }
    const handle = setTimeout(preloadAllPreviews, 1000);
    return () => clearTimeout(handle);
  }, []);
}

export function FormatsGallery() {
  const { ready, target, opening, apply } = useApplyFormat();
  const [previewId, setPreviewId] = useState<TemplateId | null>(null);
  const free = useProTools() === false;
  const current = target ? templateOf(target) : null;
  const actionLabel = target || !ready ? "Use this format" : "Try it with a sample";
  usePreloadPreviewsWhenIdle();

  return (
    <div className="flex flex-col gap-6">
      <p className="min-h-6 text-sm/6 text-muted">
        {!ready ? null : target ? (
          <>
            Picking a format applies it to{" "}
            <span className="font-medium text-ink">{resumeLabel(target)}</span> and opens the
            download step.
          </>
        ) : (
          "No resume yet. Try any format with a sample resume, then swap in your own."
        )}
      </p>
      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {TEMPLATE_LIST.map((info) => (
          <li key={info.id}>
            <FormatCard
              info={info}
              inUse={current === info.id}
              pro={free && isProTemplate(info.id)}
              actionLabel={actionLabel}
              ready={ready && opening === null}
              opening={opening === info.id}
              onUse={() => void apply(info.id)}
              onPreview={() => setPreviewId(info.id)}
            />
          </li>
        ))}
      </ul>
      <FormatPreviewDialog
        info={previewId ? TEMPLATE_INFO[previewId] : null}
        onClose={() => setPreviewId(null)}
        actionLabel={actionLabel}
        ready={ready && opening === null}
        opening={opening !== null && opening === previewId}
        onUse={(info) => void apply(info.id)}
      />
    </div>
  );
}
