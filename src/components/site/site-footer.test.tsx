import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MERCHANT } from "@/app/[lang]/(marketing)/_components/merchant";
import { BRAND } from "@/config/brand";
import { englishMessages } from "@/i18n/messages";
import { SEO_PATHS } from "@/lib/seo-pages/paths";
import { FOOTER_GROUPS } from "./routes";
import { SiteFooter } from "./site-footer";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const { footer } = englishMessages().site;

describe("SiteFooter", () => {
  it("groups its links under Product, Guides and Legal, with the comparisons in Guides", async () => {
    const html = renderToStaticMarkup(await SiteFooter({ locale: "en" }));
    for (const group of FOOTER_GROUPS) {
      const title = footer.groups[group.id];
      const start = html.indexOf(`>${title}</h2>`);
      expect(start, title).toBeGreaterThan(-1);
      const list = html.slice(start, html.indexOf("</ul>", start));
      for (const link of group.links) {
        expect(list, link.key).toContain(`href="${link.href}">${footer.links[link.key]}<`);
      }
    }
    const guides = html.slice(html.indexOf(">Guides</h2>"));
    expect(guides.slice(0, guides.indexOf("</ul>"))).toContain(`href="${SEO_PATHS.compare}"`);
  });

  it("names who takes the payments", async () => {
    const year = new Date().getUTCFullYear();
    expect(text(renderToStaticMarkup(await SiteFooter({ locale: "en" })))).toContain(
      `© ${year} ${BRAND.name} · Payments by ${MERCHANT.name}`,
    );
  });

  it("links a translated footer to its own pages, and leaves out guides not in its language", async () => {
    const html = renderToStaticMarkup(await SiteFooter({ locale: "es" }));
    expect(html).toContain('href="/es/pricing"');
    expect(html).toContain('href="/es/privacy"');
    expect(html).toContain('href="/es"');
    expect(html).not.toContain(`href="${SEO_PATHS.compare}"`);
    expect(html).not.toContain('href="/es/compare"');
  });
});
