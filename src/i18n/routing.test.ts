import { readdirSync } from "node:fs";
import path from "node:path";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { config } from "@/proxy";
import { cookieLocale, internalPath, isAppPath, routeLocale } from "./routing";

const ROOT = process.cwd();

describe("routeLocale", () => {
  it("serves unprefixed public pages in English", () => {
    for (const pathname of ["/", "/pricing", "/login", "/ats/workday", "/privacy"]) {
      expect(routeLocale(pathname, undefined)).toEqual({ action: "serve", locale: "en", pathname });
    }
    expect(internalPath("en", "/")).toBe("/en");
    expect(internalPath("en", "/pricing")).toBe("/en/pricing");
    expect(internalPath("pt-BR", "/pricing")).toBe("/pt-br/pricing");
  });

  it("moves /en and /en/* to the unprefixed address for good", () => {
    expect(routeLocale("/en", undefined)).toEqual({
      action: "redirect",
      pathname: "/",
      status: 308,
    });
    expect(routeLocale("/en/pricing", undefined)).toEqual({
      action: "redirect",
      pathname: "/pricing",
      status: 308,
    });
    expect(routeLocale("/en/ats/workday", "es")).toMatchObject({
      pathname: "/ats/workday",
      status: 308,
    });
  });

  it("keeps a redirect on this site whatever slashes follow the prefix", () => {
    expect(routeLocale("/en//evil.example/x", undefined)).toMatchObject({
      action: "redirect",
      pathname: "/evil.example/x",
    });
    expect(routeLocale("/en///dashboard", undefined)).toMatchObject({ pathname: "/dashboard" });
  });

  it("sets the app's language from a prefixed app link, then drops the prefix", () => {
    for (const pathname of [
      "/dashboard",
      "/dashboard/jobs",
      "/studio",
      "/account",
      "/s/abc",
      "/reminder",
      "/extension/connect",
    ]) {
      expect(routeLocale(`/en${pathname}`, undefined)).toEqual({
        action: "redirect",
        pathname,
        status: 307,
        cookie: "en",
      });
    }
  });

  it("serves the app in the cookie's language, but only a live one", () => {
    for (const cookie of ["en", "es", "pt-BR", "fr", "de"] as const) {
      expect(routeLocale("/dashboard/jobs", cookie), cookie).toEqual({
        action: "serve",
        locale: cookie,
        pathname: "/dashboard/jobs",
      });
      expect(cookieLocale(cookie)).toBe(cookie);
    }
    for (const cookie of ["xx", "", "en-US", "pt-br", undefined]) {
      expect(routeLocale("/dashboard/jobs", cookie), String(cookie)).toEqual({
        action: "serve",
        locale: "en",
        pathname: "/dashboard/jobs",
      });
      expect(cookieLocale(cookie)).toBeNull();
    }
  });

  it("serves a live language's public pages under its prefix, and its app paths set the cookie", () => {
    expect(routeLocale("/es", undefined)).toEqual({ action: "serve", locale: "es", pathname: "/" });
    expect(routeLocale("/pt-br/pricing", undefined)).toEqual({
      action: "serve",
      locale: "pt-BR",
      pathname: "/pricing",
    });
    expect(routeLocale("/fr/studio", undefined)).toEqual({
      action: "redirect",
      pathname: "/studio",
      status: 307,
      cookie: "fr",
    });
  });

  it("treats a prefix that isn't a language as an unknown path, so it gets the 404", () => {
    for (const pathname of ["/xx", "/xx/pricing", "/pt-pt/pricing", "/ES/pricing"]) {
      const route = routeLocale(pathname, "es");
      expect(route, pathname).toEqual({ action: "serve", locale: "en", pathname });
      expect(internalPath("en", pathname)).toBe(`/en${pathname}`);
    }
  });

  it("knows the app's sections and nothing that only starts like one", () => {
    expect(isAppPath("/s")).toBe(true);
    expect(isAppPath("/studio/x")).toBe(true);
    for (const pathname of ["/studios", "/dashboardish", "/sitemap", "/accounts", "/"]) {
      expect(isAppPath(pathname), pathname).toBe(false);
    }
  });

  it("leaves routes outside [lang] alone", () => {
    for (const pathname of [
      "/api/me",
      "/auth/callback",
      "/p/maya-chen",
      "/p/maya-chen/opengraph-image",
      "/_next/static/chunks/app.js",
      "/opengraph-image",
      "/apple-icon",
      "/icon.svg",
      "/sitemap.xml",
      "/robots.txt",
      "/llms.txt",
      "/llms-full.txt",
    ]) {
      expect(routeLocale(pathname, undefined), pathname).toEqual({ action: "pass" });
    }
    // A bare section name has no route: it goes to the 404 like any unknown path.
    for (const pathname of ["/api", "/auth", "/p"]) {
      expect(routeLocale(pathname, undefined).action, pathname).toBe("serve");
    }
  });

  it("leaves every file in public/ alone, so the proxy never hides one", () => {
    const files = (dir: string): string[] =>
      readdirSync(path.join(ROOT, "public", dir), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? files(path.join(dir, entry.name))
          : [`/${path.join(dir, entry.name)}`],
      );
    const all = files("");
    expect(all.length).toBeGreaterThan(50);
    const rewritten = all.filter(
      (url) =>
        unstable_doesMiddlewareMatch({ config, url }) &&
        routeLocale(url, undefined).action !== "pass",
    );
    expect(rewritten).toEqual([]);
  });

  it("leaves every route outside [lang] alone", () => {
    const outside = readdirSync(path.join(ROOT, "src/app"), { withFileTypes: true })
      .filter(
        (entry) => entry.isDirectory() && !entry.name.startsWith("[") && entry.name !== "fonts",
      )
      .map((entry) => entry.name);
    expect(outside.sort()).toEqual(["api", "auth", "llms-full.txt", "llms.txt", "p"]);
    for (const name of outside) {
      const url = name.includes(".") ? `/${name}` : `/${name}/x`;
      expect(routeLocale(url, undefined), url).toEqual({ action: "pass" });
    }
  });
});
