import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fitToContent, insertsOneCharacter } from "./textarea-fit";

const BORDER = 1;
const ROWS_HEIGHT = 40;

// A textarea whose text needs `needed` px; a size read after a write counts as one page layout.
function fakeArea(needed: number, height = "") {
  let styleHeight = height;
  let dirty = true;
  let layouts = 0;
  const box = () =>
    styleHeight === "" || styleHeight === "auto" ? ROWS_HEIGHT : Number.parseFloat(styleHeight);
  const read = (value: () => number) => {
    if (dirty) layouts += 1;
    dirty = false;
    return value();
  };
  const element = {
    style: {
      get height() {
        return styleHeight;
      },
      set height(value: string) {
        styleHeight = value;
        dirty = true;
      },
    },
    get offsetHeight() {
      return read(box);
    },
    get clientHeight() {
      return read(() => box() - 2 * BORDER);
    },
    get scrollHeight() {
      return read(() => Math.max(needed, box() - 2 * BORDER));
    },
  } as unknown as HTMLTextAreaElement;
  return { element, layouts: () => layouts, height: () => styleHeight };
}

describe("fitToContent", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { scrollY: 0, scrollTo: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("grows a box the text overflows in place, with one layout", () => {
    const area = fakeArea(100, "62px");
    fitToContent(area.element);
    expect(area.height()).toBe("102px");
    expect(area.layouts()).toBe(1);
  });

  it("leaves the height alone after a typed character that still fits", () => {
    const area = fakeArea(100, "102px");
    fitToContent(area.element, true);
    expect(area.height()).toBe("102px");
    expect(area.layouts()).toBe(1);
  });

  it("leaves a box that was never fitted at its natural height", () => {
    const area = fakeArea(20);
    fitToContent(area.element);
    expect(area.height()).toBe("");
    expect(area.layouts()).toBe(1);
  });

  it("shrinks a box after text was taken out", () => {
    const area = fakeArea(100, "202px");
    fitToContent(area.element);
    expect(area.height()).toBe("102px");
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

describe("insertsOneCharacter", () => {
  it("is true for one character typed anywhere", () => {
    expect(insertsOneCharacter("", "a")).toBe(true);
    expect(insertsOneCharacter("abc", "abcd")).toBe(true);
    expect(insertsOneCharacter("abc", "abXc")).toBe(true);
    expect(insertsOneCharacter("abc", "Xabc")).toBe(true);
    expect(insertsOneCharacter("aa", "aaa")).toBe(true);
  });

  it("is false for anything else, even text one character longer", () => {
    expect(insertsOneCharacter("abc", "abc")).toBe(false);
    expect(insertsOneCharacter("abc", "abcde")).toBe(false);
    expect(insertsOneCharacter("abcd", "abc")).toBe(false);
    expect(insertsOneCharacter("one\n\n\ntwo", "one two six")).toBe(false);
    expect(insertsOneCharacter("abc", "xbcd")).toBe(false);
  });
});
