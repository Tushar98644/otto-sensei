import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GlobalNotFound, { metadata, viewport } from "./global-not-found";

// Page views need the router, which a static render doesn't have.
vi.mock("@/lib/analytics/analytics", () => ({ Analytics: () => null }));

describe("the 404 for URLs no route matches", () => {
  it("is the app's own 404 in a full English document, as the root layout drew it", async () => {
    const html = renderToStaticMarkup(await GlobalNotFound());
    expect(html).toMatch(
      /^<html lang="en"><head>.*<\/head><body><a href="#main"[^>]*>Skip to content<\/a>/,
    );
    expect(html).toContain("Page not found</h1>");
    expect(html).toContain(">Check my resume</a>");
  });

  it("keeps the root layout's head", () => {
    expect(metadata.title).toEqual({ absolute: "Page not found · Otto Sensei" });
    expect(metadata.metadataBase).toBeInstanceOf(URL);
    expect(metadata.openGraph).toMatchObject({ type: "website", locale: "en_US" });
    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(viewport).toEqual({ themeColor: "#fbfcfa", colorScheme: "only light" });
  });
});
