import { crc32 } from "node:zlib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { mediaKey, MEDIA_LIMITS, MEDIA_SIZES, sniffImageType } from "./media";
import { MediaError, processImage } from "./media-image";
import { localMediaPath } from "./media-store";

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);
const ascii = (text: string) => [...text].map((ch) => ch.charCodeAt(0));

async function picture(width: number, height: number, format: "png" | "jpeg" | "webp" | "avif") {
  const image = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 80, b: 40 } },
  });
  return new Uint8Array(await image[format]().toBuffer());
}

describe("recognising pictures by their first bytes", () => {
  it("knows png, jpeg, webp and avif", () => {
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")))).toBe(
      "image/webp",
    );
    expect(sniffImageType(bytes(0, 0, 0, 0x1c, ...ascii("ftypavif")))).toBe("image/avif");
    expect(
      sniffImageType(bytes(0, 0, 0, 0x1c, ...ascii("ftypmif1"), 0, 0, 0, 0, ...ascii("avif"))),
    ).toBe("image/avif");
  });

  it("refuses everything else, whatever the file is called", () => {
    expect(sniffImageType(bytes(...ascii("GIF89a")))).toBeNull();
    expect(sniffImageType(bytes(...ascii("<svg xmlns=")))).toBeNull();
    expect(sniffImageType(bytes(...ascii("%PDF-1.7")))).toBeNull();
    // HEIC from iPhones is also ISO-BMFF, but not AVIF.
    expect(
      sniffImageType(bytes(0, 0, 0, 0x18, ...ascii("ftypheic"), 0, 0, 0, 0, ...ascii("mif1"))),
    ).toBeNull();
    expect(sniffImageType(new Uint8Array(4))).toBeNull();
  });

  it("keeps every account's files in its own folder, and nothing else maps to a path", () => {
    const key = mediaKey(
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    );
    expect(key).toBe(
      "00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.webp",
    );
    expect(localMediaPath(key)).toMatch(/\.uploads\/00000000-0000-4000-8000-000000000001\//);
    expect(localMediaPath("../../etc/passwd")).toBeNull();
    expect(localMediaPath("a/b.png")).toBeNull();
  });
});

describe("processing an upload", () => {
  it("shrinks a big screenshot to the kind's size and re-encodes it as WebP", async () => {
    const out = await processImage(await picture(3200, 2000, "png"), "screenshot");
    expect(out.source).toBe("image/png");
    expect(Math.max(out.width, out.height)).toBe(MEDIA_SIZES.screenshot.maxSide);
    expect(out.width / out.height).toBeCloseTo(1.6, 1);
    expect(sniffImageType(out.bytes)).toBe("image/webp");
  });

  it("never enlarges a small picture, and squares logos down to 256px", async () => {
    expect((await processImage(await picture(300, 200, "jpeg"), "photo")).width).toBe(300);
    const logo = await processImage(await picture(1024, 1024, "webp"), "logo");
    expect([logo.width, logo.height]).toEqual([256, 256]);
  });

  it("accepts AVIF", async () => {
    const out = await processImage(await picture(64, 64, "avif"), "avatar");
    expect(out.source).toBe("image/avif");
  });

  it("refuses a file dressed up as another type, a broken one and a huge one", async () => {
    const png = await picture(10, 10, "png");
    const jpegInside = await picture(10, 10, "jpeg");
    const fake = new Uint8Array([...png.subarray(0, 8), ...jpegInside]);
    await expect(processImage(fake, "photo")).rejects.toBeInstanceOf(MediaError);
    await expect(
      processImage(new Uint8Array(ascii("GIF89a....").concat(new Array(20).fill(1))), "photo"),
    ).rejects.toMatchObject({ reason: "type" });
    // A tiny file whose header claims 9000x9000: refused before anything is decoded.
    const huge = await picture(1, 1, "png");
    const view = new DataView(huge.buffer, huge.byteOffset);
    view.setUint32(16, 9000);
    view.setUint32(20, 9000);
    view.setUint32(29, crc32(huge.subarray(12, 29)));
    expect(9000 * 9000).toBeGreaterThan(MEDIA_LIMITS.maxInputPixels);
    await expect(processImage(huge, "photo")).rejects.toMatchObject({ reason: "too_many_pixels" });
  });
});
