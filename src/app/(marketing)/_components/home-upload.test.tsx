import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openStudioWithFile } from "@/components/match-check/open-studio";
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

vi.mock("@/components/match-check/open-studio", () => ({ openStudioWithFile: vi.fn() }));
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn() }));

const pdf = () => new File(["%PDF-1.7"], "maya-chen.pdf", { type: "application/pdf" });

beforeEach(() => {
  resetHomeUpload();
  vi.mocked(openStudioWithFile).mockReset();
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
  it("hands the file to the studio and goes there", async () => {
    vi.mocked(openStudioWithFile).mockResolvedValue(true);
    const go = vi.fn();
    const file = pdf();
    await openHomeFile({ file }, go);
    expect(openStudioWithFile).toHaveBeenCalledWith(file, expect.any(Function));
    expect(go).toHaveBeenCalledWith("/studio");
    expect(homeUploadState().opening).toBe("maya-chen.pdf");
  });

  it("shows the problem instead of leaving the page", async () => {
    const go = vi.fn();
    await openHomeFile({ problem: "Choose one file at a time." }, go);
    expect(toast).toHaveBeenCalledWith({ title: "Choose one file at a time.", variant: "error" });
    expect(openStudioWithFile).not.toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();
  });

  it("stays on the page with the upgrade offer when there's no room, and takes the next file", async () => {
    vi.mocked(openStudioWithFile).mockResolvedValue(false);
    const go = vi.fn();
    await openHomeFile({ file: pdf() }, go);
    expect(homeUploadState()).toMatchObject({ opening: null, upgrade: true });
    await openHomeFile({ file: pdf() }, go);
    expect(openStudioWithFile).toHaveBeenCalledTimes(2);
    expect(homeUploadState().upgrade).toBe(true);
    expect(go).not.toHaveBeenCalled();
  });

  it("opens the same file once the old resume is replaced from the upgrade offer", async () => {
    vi.mocked(openStudioWithFile).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const go = vi.fn();
    const file = pdf();
    await openHomeFile({ file }, go);
    const retry = vi.mocked(openStudioWithFile).mock.calls[0]?.[1];
    retry?.();
    await vi.waitFor(() => expect(go).toHaveBeenCalledWith("/studio"));
    expect(openStudioWithFile).toHaveBeenLastCalledWith(file, expect.any(Function));
  });

  it("ignores a second file while the first is opening", async () => {
    let finish: (room: boolean) => void = () => {};
    vi.mocked(openStudioWithFile).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const go = vi.fn();
    const first = openHomeFile({ file: pdf() }, go);
    await vi.waitFor(() => expect(openStudioWithFile).toHaveBeenCalledTimes(1));
    await openHomeFile({ file: pdf() }, go);
    finish(true);
    await first;
    expect(openStudioWithFile).toHaveBeenCalledTimes(1);
    expect(go).toHaveBeenCalledTimes(1);
  });

  it("falls back to a plain visit to the studio when its code can't load", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    vi.mocked(openStudioWithFile).mockRejectedValue(new Error("chunk failed"));
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
