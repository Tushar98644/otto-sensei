"use client";

import { ArrowLeft, ArrowRight, ImagePlus, X } from "lucide-react";
import { useState } from "react";
import { Dropzone } from "@/components/ui/dropzone";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { api, isApiError } from "@/lib/api/client";
import type { ImageRef, UploadedImage } from "@/lib/portfolio/content";
import { imageOf } from "@/lib/portfolio/content-view";
import { IMAGE_ACCEPT, MEDIA_LIMITS, type MediaKind } from "@/lib/portfolio/media";
import { cn } from "@/lib/utils";
import { setMediaUsage, useContentStore } from "./content-store";

// Drop zones for portfolio pictures: drop or pick a file, see it at once, replace or remove it.
// The server shrinks and re-encodes it (src/lib/portfolio/media-image.ts); removing one keeps
// the file a while on the server, so the Undo toast can bring it back.

async function upload(file: File, kind: MediaKind): Promise<UploadedImage | null> {
  try {
    const { image, media } = await api.uploadPortfolioMedia(file, kind);
    setMediaUsage(media);
    return image;
  } catch (error) {
    toast({
      title: "Couldn't add that picture",
      description: isApiError(error) ? error.message : "Check your connection and try again.",
      variant: "error",
    });
    return null;
  }
}

function reject(message: string) {
  toast({ title: "Couldn't add that picture", description: message, variant: "error" });
}

type ImageFieldProps = {
  label: string;
  value: ImageRef | null;
  kind: MediaKind;
  onChange: (value: ImageRef | null, undo?: string) => void;
  // "aspect-square" for a photo, "aspect-video" for a screenshot.
  aspect?: string;
  hint?: string;
  // Drawn when there is no picture, e.g. the automatic Google photo or a monogram.
  fallback?: { src: string | null; text: string } | null;
};

/** One picture: a drop zone when empty, the picture with Replace and Remove when set. */
export function ImageField({
  label,
  value,
  kind,
  onChange,
  aspect = "aspect-square",
  hint,
  fallback,
}: ImageFieldProps) {
  const mediaBase = usePortfolioMediaBase();
  const [busy, setBusy] = useState(false);
  const image = imageOf(value, mediaBase);
  const shown = image?.src ?? fallback?.src ?? null;

  async function take(file: File) {
    setBusy(true);
    const stored = await upload(file, kind);
    setBusy(false);
    if (stored) onChange({ ...stored, alt: value?.alt ?? "" });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-ink">{label}</p>
      <div className="flex items-start gap-4">
        <Dropzone
          onFile={(file) => void take(file)}
          onReject={reject}
          accept={IMAGE_ACCEPT}
          maxBytes={MEDIA_LIMITS.maxUploadBytes}
          disabled={busy}
          label={shown ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
          className={cn(
            "relative w-28 shrink-0 overflow-hidden p-0 sm:w-32",
            aspect,
            shown && "border-solid",
          )}
        >
          {shown ? (
            // Owner's own picture, any host: next/image would need every host listed.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="absolute inset-0 size-full object-cover" />
          ) : fallback?.text ? (
            <span className="font-display text-3xl/none text-muted">{fallback.text}</span>
          ) : (
            <ImagePlus className="size-6 text-ink" aria-hidden />
          )}
          {busy ? (
            <span className="absolute inset-0 flex items-center justify-center bg-surface/70">
              <Spinner className="size-5" />
            </span>
          ) : null}
        </Dropzone>
        <div className="flex min-w-0 flex-col gap-2 pt-1">
          <p className="text-sm/5 text-muted">
            {hint ?? "Drop a PNG, JPEG, WebP or AVIF here, up to 4 MB. We shrink it for the web."}
          </p>
          {value ? (
            <Button
              size="sm"
              variant="ghost"
              className="self-start"
              onClick={() => onChange(null, `${label} removed`)}
            >
              <X className="size-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type ImageStripProps = {
  label: string;
  images: readonly ImageRef[];
  max: number;
  kind: MediaKind;
  onChange: (images: ImageRef[], undo?: string) => void;
  // A new upload, appended by the caller to whatever the list holds by the time it lands.
  onAdd: (image: UploadedImage) => void;
  hint?: string;
};

/** Several pictures in order (screenshots, personal photos): add, reorder, remove. */
export function ImageStrip({ label, images, max, kind, onChange, onAdd, hint }: ImageStripProps) {
  const mediaBase = usePortfolioMediaBase();
  const [busy, setBusy] = useState(false);
  const move = (from: number, to: number) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };

  async function take(file: File) {
    setBusy(true);
    const stored = await upload(file, kind);
    setBusy(false);
    if (stored) onAdd(stored);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-ink">
        {label}{" "}
        <span className="font-normal text-muted">
          ({images.length} of {max})
        </span>
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((ref, index) => {
          const src = imageOf(ref, mediaBase)?.src;
          return (
            <li key={ref.kind === "upload" ? ref.id : ref.url} className="flex flex-col gap-1">
              <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-muted ring-1 ring-border">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="size-full object-cover" />
                ) : null}
                {index === 0 && images.length > 1 ? (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-ink px-2 text-xs/5 text-white">
                    Cover
                  </span>
                ) : null}
              </div>
              <div className="flex">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Move earlier"
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Move later"
                  disabled={index === images.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Remove picture"
                  className="ml-auto"
                  onClick={() =>
                    onChange(
                      images.filter((_, i) => i !== index),
                      "Picture removed",
                    )
                  }
                >
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          );
        })}
        {images.length < max ? (
          <li>
            <Dropzone
              onFile={(file) => void take(file)}
              onReject={reject}
              accept={IMAGE_ACCEPT}
              maxBytes={MEDIA_LIMITS.maxUploadBytes}
              disabled={busy}
              label={`Add to ${label.toLowerCase()}`}
              className="aspect-video gap-1 px-2 py-2"
            >
              {busy ? (
                <Spinner className="size-5" />
              ) : (
                <ImagePlus className="size-5 text-ink" aria-hidden />
              )}
              <span className="text-xs/4 text-muted">Drop or pick</span>
            </Dropzone>
          </li>
        ) : null}
      </ul>
      {hint ? <p className="text-sm/5 text-subtle">{hint}</p> : null}
    </div>
  );
}

/** Where this server serves uploads from; set by the portfolio the editor loaded. */
export function usePortfolioMediaBase(): string {
  return useContentStore((state) => state.mediaBase);
}
