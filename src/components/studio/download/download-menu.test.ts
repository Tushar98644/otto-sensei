import { describe, expect, it, vi } from "vitest";
import type { MenuAction, MenuEntry } from "@/components/ui/menu";
import { EN } from "../testing";
import { downloadMenuItems, type DownloadMenuInput } from "./download-menu";

function input(overrides: Partial<DownloadMenuInput> = {}): DownloadMenuInput {
  return {
    pro: true,
    wordBuilding: false,
    previewUrl: "blob:preview",
    onWord: vi.fn(),
    onCopyText: vi.fn(),
    onShare: vi.fn(),
    onPreview: vi.fn(),
    ...overrides,
  };
}

const actions = (entries: MenuEntry[]) =>
  entries.filter((entry): entry is MenuAction => entry !== "separator");
const item = (entries: MenuEntry[], label: string) =>
  actions(entries).find((entry) => entry.label === label)!;

describe("downloadMenuItems", () => {
  it("holds everything but the PDF download, in one menu", () => {
    expect(
      actions(downloadMenuItems(EN.studioDownload.menu, input())).map((entry) => entry.label),
    ).toEqual(["Download Word", "Copy plain text", "Copy share link", "Preview"]);
  });

  it("marks Word and the share link as Pro on Free, and not on a paid plan or while loading", () => {
    const free = downloadMenuItems(EN.studioDownload.menu, input({ pro: false }));
    expect(item(free, "Download Word").pro).toBe(true);
    expect(item(free, "Copy share link").pro).toBe(true);
    expect(item(free, "Copy plain text").pro).toBeFalsy();
    for (const pro of [true, null]) {
      const items = downloadMenuItems(EN.studioDownload.menu, input({ pro }));
      expect(actions(items).some((entry) => entry.pro)).toBe(false);
    }
  });

  it("still lets Free pick Word, so the click opens the trial prompt instead of nothing", () => {
    const onWord = vi.fn();
    const word = item(
      downloadMenuItems(EN.studioDownload.menu, input({ pro: false, onWord })),
      "Download Word",
    );
    expect(word.disabled).toBeFalsy();
    word.onSelect();
    expect(onWord).toHaveBeenCalledOnce();
  });

  it("keeps Preview off until the PDF is ready, then opens that file", () => {
    expect(
      item(downloadMenuItems(EN.studioDownload.menu, input({ previewUrl: null })), "Preview")
        .disabled,
    ).toBe(true);
    const onPreview = vi.fn();
    item(downloadMenuItems(EN.studioDownload.menu, input({ onPreview })), "Preview").onSelect();
    expect(onPreview).toHaveBeenCalledWith("blob:preview");
  });

  it("says when the Word file is being made and won't start a second one", () => {
    const word = item(
      downloadMenuItems(EN.studioDownload.menu, input({ wordBuilding: true })),
      "Download Word",
    );
    expect(word).toMatchObject({ disabled: true, description: "Making your Word file" });
  });
});
