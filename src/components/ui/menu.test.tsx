import { Trash2 } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Menu, type MenuEntry } from "./menu";

const ITEMS: MenuEntry[] = [
  { label: "Rename", description: "Give it a new name", onSelect: () => {} },
  { label: "Sort by name", checked: true, onSelect: () => {} },
  "separator",
  { label: "Delete", icon: Trash2, tone: "danger", onSelect: () => {} },
];

const markup = () =>
  renderToStaticMarkup(
    <Menu
      label="Resume actions"
      triggerLabel="More for Sample resume"
      trigger="More"
      items={ITEMS}
    />,
  );

describe("Menu", () => {
  it("keeps a closed menu's items out of the page until it opens", () => {
    const html = markup();
    expect(html).toMatch(/role="menu"[^>]*><\/div>$/);
    expect(html).not.toMatch(/menuitem|separator/);
    for (const text of ["Rename", "Give it a new name", "Sort by name", "Delete"]) {
      expect(html, text).not.toContain(text);
    }
  });

  it("serves a closed menu button that can't open its empty panel before hydration", () => {
    const html = markup();
    expect(html).not.toMatch(/popovertarget/i);
    const panelId = html.match(/aria-controls="([^"]+)"/)?.[1];
    expect(panelId).toBeTruthy();
    expect(html).toContain(
      `id="${panelId}" popover="auto" role="menu" aria-label="Resume actions"`,
    );
    expect(html).toContain('aria-haspopup="menu" aria-expanded="false"');
    expect(html).toContain('aria-label="More for Sample resume"');
    expect(html).toContain(">More</button>");
  });
});
