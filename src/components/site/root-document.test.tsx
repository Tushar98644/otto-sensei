import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import EN_COMMON from "@/i18n/messages/en/common";
import { RootDocument, rootMetadata } from "./root-document";

// Page views need the router, which a static render doesn't have.
vi.mock("@/lib/analytics/analytics", () => ({ Analytics: () => null }));

describe("rootMetadata", () => {
  it("sets the Open Graph locale and leaves images to the image file when none are passed", () => {
    const metadata = rootMetadata("en");
    expect(metadata.openGraph).toEqual({
      type: "website",
      siteName: "Otto Sensei",
      locale: "en_US",
    });
    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(rootMetadata("pt-BR").openGraph).toMatchObject({ locale: "pt_BR" });
  });

  it("passes the app's image on as a path, so its own metadataBase places it", () => {
    const image = {
      url: new URL("http://localhost:3000/opengraph-image?daf9864011b9a10a"),
      type: "image/png",
      width: 1200,
      height: 630,
      alt: "Otto",
    };
    expect(rootMetadata("en", [image]).openGraph).toMatchObject({
      images: [{ ...image, url: "/opengraph-image?daf9864011b9a10a" }],
    });
    expect(rootMetadata("en", ["https://otto.test/a.png?v=1"]).openGraph).toMatchObject({
      images: ["/a.png?v=1"],
    });
    expect(rootMetadata("en", []).openGraph).not.toHaveProperty("images");
  });
});

describe("RootDocument", () => {
  it("writes the language on <html> and the skip link first", () => {
    const html = renderToStaticMarkup(
      <RootDocument lang="pt-BR" skipLabel="Pular para o conteúdo" referral={EN_COMMON.referral}>
        <main id="main" />
      </RootDocument>,
    );
    expect(html).toMatch(
      /^<html lang="pt-BR"><head><\/head><body><a href="#main"[^>]*>Pular para o conteúdo<\/a>/,
    );
  });
});
