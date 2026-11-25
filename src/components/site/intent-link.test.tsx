import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { heroCtaCopy } from "@/app/[lang]/(marketing)/_components/hero";
import { HeroCta } from "@/app/[lang]/(marketing)/_components/hero-cta";
import { PricingPlans } from "@/app/[lang]/(marketing)/_components/pricing-plans";
import { PrimaryCta } from "@/app/[lang]/(marketing)/_components/primary-cta";
import NotFound from "@/app/[lang]/not-found";
import { englishMessages } from "@/i18n/messages";
import { HeaderActions } from "./account-link";
import { IntentLink } from "./intent-link";
import { FOOTER_HREFS, mainNav, ROUTES } from "./routes";
import { SiteFooter } from "./site-footer";
import { headerCopy, SiteHeader } from "./site-header";
import { TextLink } from "./text-link";

type Rendered = { href: string; prefetch: unknown };

const rendered = vi.hoisted(() => [] as Rendered[]);

vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    children,
  }: {
    href: string;
    prefetch?: unknown;
    children?: ReactNode;
  }) => {
    rendered.push({ href, prefetch });
    return <a href={href}>{children}</a>;
  },
}));

function linksIn(node: ReactNode): Rendered[] {
  rendered.length = 0;
  renderToStaticMarkup(node);
  return [...rendered];
}

const studioLinks = (links: Rendered[]) => links.filter((link) => link.href === ROUTES.studio);

const HEADER_COPY = await headerCopy("en");
const NOT_FOUND = await NotFound();

beforeEach(() => {
  rendered.length = 0;
});

describe("IntentLink", () => {
  it("doesn't prefetch a link just because it is on screen", () => {
    expect(linksIn(<IntentLink href={ROUTES.studio}>Open</IntentLink>)).toEqual([
      { href: ROUTES.studio, prefetch: false },
    ]);
    expect(linksIn(<TextLink href={ROUTES.privacy}>Privacy</TextLink>)).toEqual([
      { href: ROUTES.privacy, prefetch: false },
    ]);
  });
});

describe("links to the studio", () => {
  it.each([
    ["the header button", <HeaderActions key="header" copy={HEADER_COPY} />],
    ["the hero and closing button", <PrimaryCta key="cta" copy={englishMessages().home.cta} />],
    [
      "the hero's button and job match line",
      <HeroCta key="hero" copy={heroCtaCopy(englishMessages().home, (path) => path)} />,
    ],
    [
      "the Free plan card",
      <PricingPlans
        key="plans"
        t={englishMessages().pricing}
        locale="en"
        termsHref={ROUTES.terms}
        offer={{ pro: ["month"], max: ["month"] }}
      />,
    ],
    ["the 404 page", NOT_FOUND],
  ])("leave the studio's code alone until someone reaches for %s", (_, node) => {
    const links = studioLinks(linksIn(node));
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link.prefetch).toBe(false);
  });
});

describe("site chrome", () => {
  it("never prefetches the home page from the logo, nor anything from the footer", async () => {
    const links = linksIn(await SiteFooter({ locale: "en" }));
    expect(links.map((link) => link.href)).toEqual([ROUTES.home, ...FOOTER_HREFS]);
    for (const link of links) expect(link.prefetch).toBe(false);
  });

  it("keeps the main navigation prefetched", async () => {
    const links = linksIn(await SiteHeader({ locale: "en" }));
    expect(links.find((link) => link.href === ROUTES.home)?.prefetch).toBe(false);
    for (const nav of mainNav(englishMessages().site.nav)) {
      expect(links.find((link) => link.href === nav.href)?.prefetch).toBeUndefined();
    }
  });
});
