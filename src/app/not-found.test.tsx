import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import NotFound from "./not-found";

const decode = (value: string) =>
  value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#x27;", "'");

describe("the 404 page", () => {
  it("leads with checking a resume, keeps the home page as a quiet second key, and never shows the header's copy of the first", () => {
    const html = renderToStaticMarkup(<NotFound />);
    const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
    const keys = [...main.matchAll(/<a([^>]*)>([^<]+)</g)].map(([, attributes = "", label]) => ({
      href: /href="([^"]+)"/.exec(attributes)?.[1],
      className: decode(/class="([^"]+)"/.exec(attributes)?.[1] ?? ""),
      label,
    }));
    expect(keys).toEqual([
      { href: ROUTES.studio, className: buttonClasses({ size: "lg" }), label: "Check my resume" },
      {
        href: ROUTES.home,
        className: buttonClasses({ variant: "ghost", size: "lg" }),
        label: "Go to the home page",
      },
    ]);
    const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
    expect(header).not.toContain("Check my resume");
  });
});
