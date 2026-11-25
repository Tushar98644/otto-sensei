import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MERCHANT } from "@/app/[lang]/(marketing)/_components/merchant";
import { BRAND } from "@/config/brand";
import { SEO_PATHS } from "@/lib/seo-pages/paths";
import { FOOTER_GROUPS } from "./routes";
import { SiteFooter } from "./site-footer";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("SiteFooter", () => {
  it("groups its links under Product, Guides and Legal, with the comparisons in Guides", () => {
    const html = renderToStaticMarkup(<SiteFooter />);
    for (const group of FOOTER_GROUPS) {
      const start = html.indexOf(`>${group.title}</h2>`);
      expect(start, group.title).toBeGreaterThan(-1);
      const list = html.slice(start, html.indexOf("</ul>", start));
      for (const link of group.links) expect(list, link.label).toContain(`href="${link.href}"`);
    }
    const guides = html.slice(html.indexOf(">Guides</h2>"));
    expect(guides.slice(0, guides.indexOf("</ul>"))).toContain(`href="${SEO_PATHS.compare}"`);
  });

  it("names who takes the payments", () => {
    const year = new Date().getUTCFullYear();
    expect(text(renderToStaticMarkup(<SiteFooter />))).toContain(
      `© ${year} ${BRAND.name} · Payments by ${MERCHANT.name}`,
    );
  });
});
