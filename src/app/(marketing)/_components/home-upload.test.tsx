import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handFileToStudio } from "@/components/match-check/hand-off-file";
import { toast } from "@/components/ui/toast";
import { UPLOAD_LIMITS } from "@/config/plans";
import {
  homeUploadState,
  pickResumeFile,
  resetHomeUpload,
  setHomePicker,
  updateHomeUpload,
} from "./home-picker";
import { HomeDropCue, openHomeFile, pickedFile, typingIn } from "./home-upload";

vi.mock("@/components/match-check/hand-off-file", () => ({ handFileToStudio: vi.fn() }));
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn() }));

const pdf = () => new File(["%PDF-1.7"], "maya-chen.pdf", { type: "application/pdf" });

beforeEach(() => {
  resetHomeUpload();
  vi.mocked(handFileToStudio).mockReset();
  vi.mocked(toast).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pickedFile", () => {
  it("takes one PDF or Word file", () => {
    const file = pdf();
    expect(pickedFile([file])).toEqual({ file });
    expect(pickedFile([new File(["x"], "cv.docx")])).toMatchObject({ file: { name: "cv.docx" } });
  });

  it("ignores an empty drop or paste, so plain text pastes as usual", () => {
    expect(pickedFile(null)).toBeNull();
    expect(pickedFile([])).toBeNull();
  });

  it("says why it can't take several files, a picture or a file over the limit", () => {
    expect(pickedFile([pdf(), pdf()])).toEqual({ problem: "Choose one file at a time." });
    expect(pickedFile([new File(["x"], "shot.png", { type: "image/png" })])).toEqual({
      problem: expect.stringMatching(/isn't supported/),
    });
    const big = { name: "cv.pdf", type: "application/pdf", size: UPLOAD_LIMITS.maxBytes + 1 };
    expect(pickedFile([big as File])).toEqual({ problem: expect.stringMatching(/too big/) });
  });
});

describe("openHomeFile", () => {
  it("hands the file to the studio and goes there, where Upload asks for room", async () => {
    vi.mocked(handFileToStudio).mockResolvedValue();
    const go = vi.fn();
    const file = pdf();
    await openHomeFile({ file }, go);
    expect(handFileToStudio).toHaveBeenCalledWith(file);
    expect(go).toHaveBeenCalledWith("/studio");
    expect(homeUploadState().opening).toBe("maya-chen.pdf");
  });

  it("shows the problem instead of leaving the page", async () => {
    const go = vi.fn();
    await openHomeFile({ problem: "Choose one file at a time." }, go);
    expect(toast).toHaveBeenCalledWith({ title: "Choose one file at a time.", variant: "error" });
    expect(handFileToStudio).not.toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();
  });

  it("ignores a second file while the first is opening", async () => {
    let finish: () => void = () => {};
    vi.mocked(handFileToStudio).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const go = vi.fn();
    const first = openHomeFile({ file: pdf() }, go);
    await vi.waitFor(() => expect(handFileToStudio).toHaveBeenCalledTimes(1));
    await openHomeFile({ file: pdf() }, go);
    finish();
    await first;
    expect(handFileToStudio).toHaveBeenCalledTimes(1);
    expect(go).toHaveBeenCalledTimes(1);
  });

  it("falls back to a plain visit to the studio when its code can't load", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    vi.mocked(handFileToStudio).mockRejectedValue(new Error("chunk failed"));
    await openHomeFile({ file: pdf() }, vi.fn());
    expect(assign).toHaveBeenCalledWith("/studio");
  });
});

describe("pickResumeFile", () => {
  it("has no picker before the page hydrates, so the button stays a link to the studio", () => {
    expect(pickResumeFile()).toBe(false);
  });

  it("opens the picker once the page has one", () => {
    const click = vi.fn();
    setHomePicker({ click } as unknown as HTMLInputElement);
    expect(pickResumeFile()).toBe(true);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("keeps the link from navigating but asks for nothing while a file is opening", () => {
    const click = vi.fn();
    setHomePicker({ click } as unknown as HTMLInputElement);
    updateHomeUpload({ opening: "maya-chen.pdf" });
    expect(pickResumeFile()).toBe(true);
    expect(click).not.toHaveBeenCalled();
  });
});

describe("before a drag or a paste", () => {
  it("shows no drop cue and never takes a paste meant for a field", () => {
    expect(renderToStaticMarkup(<HomeDropCue />)).toBe("");
    expect(typingIn(null)).toBe(false);
  });
});
