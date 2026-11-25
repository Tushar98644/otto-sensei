import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { formatFor } from "@/i18n/intl";
import { translationsFor } from "@/i18n/messages";
import { createSampleResume } from "@/lib/resume/sample";
import { ActionCards } from "./home/action-cards";
import { interviewDay } from "./home/next-steps";
import { formatDay, relativeTime } from "./i18n";
import { LibraryToolbar } from "./library-toolbar";
import { EN, inEnglish, inLocale } from "./messages-testing";
import type { StudioActions } from "./use-studio-actions";

vi.mock("./use-tailor-locked", () => ({ useTailorLocked: () => true }));
vi.mock("@/components/account/upgrade-prompt", () => ({ openFeaturePrompt: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const HOUR = 60 * 60 * 1000;
const NOW = new Date(2026, 10, 22, 15).getTime();
const noon = (day: number) => new Date(2026, 10, day, 12).getTime();

const cards = () => (
  <ActionCards actions={{} as StudioActions} latest={null} pageResume={createSampleResume(0)} />
);

const toolbar = () => (
  <LibraryToolbar
    query=""
    onQueryChange={() => {}}
    filter="all"
    onFilterChange={() => {}}
    sort="edited"
    onSortChange={() => {}}
    counts={{ all: 1200, import: 3, tailored: 2, sample: 0, scratch: 0 }}
  />
);

describe("the dashboard in Spanish", () => {
  it("draws the Home action cards from the Spanish messages", async () => {
    const html = renderToStaticMarkup(await inLocale("es", cards()));
    expect(html).toContain("Revisar un currículum");
    expect(html).toContain("Adaptar a una oferta");
    expect(html).toContain("Vista del reclutador");
    expect(html).not.toContain("Check a resume");
  });

  it("labels the library's filters, search and sort in Spanish", async () => {
    const html = renderToStaticMarkup(await inLocale("es", toolbar()));
    expect(html).toContain("Subidos");
    expect(html).toContain("Adaptados");
    expect(html).toContain('placeholder="Busca por nombre o empresa"');
    expect(html).toContain("Última edición");
    expect(html).not.toMatch(/Uploaded|Last edited|Search by/);
  });

  it("keeps English exactly as it was, and groups numbers the reader's way", async () => {
    const html = renderToStaticMarkup(inEnglish(toolbar()));
    expect(html).toContain("Uploaded");
    expect(html).toContain('placeholder="Search by name or company"');
    expect(html).toContain("1,200");
    expect(renderToStaticMarkup(await inLocale("de", toolbar()))).toContain("1.200");
  });

  it("words dates and times in the reader's language", async () => {
    const es = (await translationsFor("es")).dashboard!;
    const format = formatFor("es");
    expect(interviewDay(noon(22), NOW, es, format)).toBe("Hoy");
    expect(interviewDay(noon(26), NOW, es, format)).toMatch(/^jue/);
    expect(relativeTime(format, es.card.justNow, NOW - 2 * HOUR, NOW)).toBe("hace 2 horas");
    expect(relativeTime(format, es.card.justNow, NOW, NOW)).toBe("justo ahora");
    expect(formatDay(formatFor("en"), noon(3), NOW)).toBe("Nov 3");
    expect(relativeTime(formatFor("en"), EN.dashboard.card.justNow, NOW - 2 * HOUR, NOW)).toBe(
      "2 hours ago",
    );
  });
});
