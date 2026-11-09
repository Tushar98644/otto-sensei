import { log } from "@/lib/log";
import { MEDIA_LIMITS, MEDIA_SIZES, sniffImageType, type ImageType, type MediaKind } from "./media";

// Server-only. Turns an uploaded picture into what the page serves: checked by its first bytes,
// decoded with a pixel cap, turned upright, stripped of metadata (camera GPS stays out of public
// pages), shrunk to the kind's size and re-encoded as WebP. Uses the sharp that Next ships.

export type ProcessedImage = {
  bytes: Uint8Array;
  width: number;
  height: number;
  source: ImageType;
};

export class MediaError extends Error {
  readonly reason: "type" | "unreadable" | "too_many_pixels";
  constructor(reason: MediaError["reason"], message: string) {
    super(message);
    this.name = "MediaError";
    this.reason = reason;
  }
}

type Sharp = (typeof import("sharp"))["default"];
let loaded: Promise<Sharp | null> | null = null;

// Loaded on first use: the route stays importable (and testable) where sharp's native build is missing.
function loadSharp(): Promise<Sharp | null> {
  loaded ??= import("sharp")
    .then((mod) => mod.default)
    .catch((error: unknown) => {
      log.error("portfolio.media_sharp_missing", error);
      return null;
    });
  return loaded;
}

export async function processImage(input: Uint8Array, kind: MediaKind): Promise<ProcessedImage> {
  const source = sniffImageType(input);
  if (!source) throw new MediaError("type", "not a png, jpeg, webp or avif file");
  const sharp = await loadSharp();
  if (!sharp) throw new Error("sharp is not available on this server");
  const { maxSide, quality } = MEDIA_SIZES[kind];
  try {
    const image = sharp(input, {
      limitInputPixels: MEDIA_LIMITS.maxInputPixels,
      // Only the first frame of an animated WebP or AVIF.
      animated: false,
      failOn: "error",
    });
    const meta = await image.metadata();
    const format = meta.format === "heif" ? "avif" : meta.format;
    // The bytes said one thing; the decoder must agree, or someone dressed one file as another.
    if (!format || `image/${format}` !== source) {
      throw new MediaError(
        "type",
        `header says ${source}, decoder says ${meta.format ?? "nothing"}`,
      );
    }
    const { data, info } = await image
      .rotate()
      .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    return { bytes: new Uint8Array(data), width: info.width, height: info.height, source };
  } catch (error) {
    if (error instanceof MediaError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (/pixel limit/i.test(message)) throw new MediaError("too_many_pixels", message);
    throw new MediaError("unreadable", message);
  }
}
