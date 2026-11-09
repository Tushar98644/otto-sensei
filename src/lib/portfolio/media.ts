// Pure and client-safe. Pictures owners upload for their portfolio: what each kind is for, how big
// it may be, and how a file is recognised (by its first bytes, never by its name or the type the
// browser claims). The server re-encodes every upload to WebP at the kind's size (./media-image.ts).

export const MEDIA_KINDS = ["photo", "screenshot", "personal", "logo", "avatar"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MEDIA_LIMITS = {
  // What a browser may send. Vercel turns away request bodies over 4.5 MB.
  maxUploadBytes: 4 * 1024 * 1024,
  // What the account may keep, counted after compression.
  maxFiles: 60,
  maxBytes: 60 * 1024 * 1024,
  uploadsPerHour: 60,
  // Larger images are refused before decoding (decompression bombs).
  maxInputPixels: 50_000_000,
  // A file the saved content stopped using is kept this long, so Undo can bring it back.
  detachedGraceMs: 15 * 60 * 1000,
} as const;

// The longest side after resizing, and the WebP quality. Screenshots stay sharp on 2x screens.
export const MEDIA_SIZES: Record<MediaKind, { maxSide: number; quality: number }> = {
  photo: { maxSide: 1024, quality: 84 },
  screenshot: { maxSide: 2400, quality: 82 },
  personal: { maxSide: 1600, quality: 82 },
  logo: { maxSide: 256, quality: 90 },
  avatar: { maxSide: 256, quality: 86 },
};

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
export const IMAGE_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.avif,image/png,image/jpeg,image/webp,image/avif";

const ascii = (bytes: Uint8Array, from: number, length: number) =>
  String.fromCharCode(...bytes.subarray(from, from + length));

/** The image type these bytes really are, or null for anything else (GIF, SVG, HEIC, PDF...). */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length < 12) return null;
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, i) => bytes[i] === byte)) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  // ISO-BMFF: a "ftyp" box whose major or compatible brands name AVIF.
  if (ascii(bytes, 4, 4) === "ftyp") {
    const boxSize = (bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!;
    const end = Math.min(bytes.length, Math.max(16, boxSize));
    for (let at = 8; at + 4 <= end; at += 4) {
      const brand = ascii(bytes, at, 4);
      if (brand === "avif" || brand === "avis") return "image/avif";
    }
  }
  return null;
}

/** Where an upload is stored: one folder per account, so every delete can find all of them. */
export function mediaKey(userId: string, mediaId: string): string {
  return `${userId}/${mediaId}.webp`;
}

export const MEDIA_MESSAGES = {
  noFile: "Choose a picture to upload.",
  tooLarge: `That picture is over ${MEDIA_LIMITS.maxUploadBytes / (1024 * 1024)} MB. Try a smaller copy.`,
  type: "Use a PNG, JPEG, WebP or AVIF picture.",
  unreadable: "That picture couldn't be read. Try saving it again as PNG or JPEG.",
  tooManyPixels: "That picture is huge. Make it smaller than 7,000 pixels on its longest side.",
  full: `You've used all your picture space (${MEDIA_LIMITS.maxFiles} pictures, ${MEDIA_LIMITS.maxBytes / (1024 * 1024)} MB). Remove a few first.`,
  plan: "Uploading pictures to your portfolio comes with Pro and Max.",
  unavailable: "Picture uploads aren't set up on this server yet.",
} as const;

/** The plain-words size of a stored total, "3.2 MB". */
export function mediaSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
