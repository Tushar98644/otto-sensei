import { describe, expect, it } from "vitest";
import { BRAND } from "@/config/brand";
import { pageMetadata } from "./page-metadata";

describe("pageMetadata", () => {
  const meta = pageMetadata({
    title: "Pricing",
    description: "What Free and Pro include.",
    path: "/pricing",
  });

  it("leaves the page title to the root template and sets the canonical URL", () => {
    expect(meta.title).toBe("Pricing");
    expect(meta.description).toBe("What Free and Pro include.");
    expect(meta.alternates?.canonical).toBe("/pricing");
  });

  it("restates the site-wide Open Graph fields that a page-level openGraph would drop", () => {
    expect(meta.openGraph).toMatchObject({
      type: "website",
      siteName: BRAND.name,
      locale: "en_US",
      url: "/pricing",
      title: `Pricing · ${BRAND.name}`,
      description: "What Free and Pro include.",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    });
  });

  it("uses an absolute title as is, for the home page", () => {
    const home = pageMetadata({
      title: "Free resume checker",
      description: "Home.",
      path: "/",
      absoluteTitle: true,
    });
    expect(home.title).toEqual({ absolute: "Free resume checker" });
    expect(home.openGraph?.title).toBe("Free resume checker");
  });

  it("gives every page a large Twitter card with the same title, text and image", () => {
    expect(meta.twitter).toEqual({
      card: "summary_large_image",
      title: `Pricing · ${BRAND.name}`,
      description: "What Free and Pro include.",
      images: [{ url: "/opengraph-image", alt: expect.stringContaining(BRAND.name) }],
    });
  });

  it("is indexable unless asked, and a noindex page still lets links be followed", () => {
    expect(meta.robots).toBeUndefined();
    const signIn = pageMetadata({
      title: "Sign in",
      description: "Sign in.",
      path: "/login",
      noindex: true,
    });
    expect(signIn.robots).toEqual({ index: false, follow: true });
    expect(signIn.alternates?.canonical).toBe("/login");
  });

  it("gives every page its own image object", () => {
    const other = pageMetadata({ title: "Terms", description: "Terms.", path: "/terms" });
    expect(other.openGraph?.images).not.toBe(meta.openGraph?.images);
    expect(other.openGraph?.images).toEqual(meta.openGraph?.images);
  });
});
