import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { roomForResume } from "@/components/account/pro-tools";
import { setTailorDraft, type TailorDraft } from "@/components/studio/tailor/session";
import { clearHandedUpload, handedUpload } from "@/components/studio/upload/upload-handoff";
import { track } from "@/lib/analytics/client";
import { useStudioStore } from "@/lib/store/resume-store";
import { openStudioWith, openStudioWithFile } from "./open-studio";
import { sampleTexts } from "./sample";

vi.mock("@/components/account/pro-tools", () => ({ roomForResume: vi.fn() }));
vi.mock("@/components/studio/tailor/session", () => ({ setTailorDraft: vi.fn() }));
vi.mock("@/lib/analytics/client", () => ({ track: vi.fn() }));

const store = () => useStudioStore.getState();
const job: TailorDraft = { title: "", company: "", text: "A pasted job post.", paste: true };

const RESUME = `Priya Raman
priya.raman@example.com | +1 555 010 2233 | Austin, TX

EXPERIENCE
Data Analyst | Lumen Health | Austin, TX
Jan 2021 - Present
- Built weekly SQL reports in Looker that cut month-end close from 6 days to 2.
- Cleaned claims data in Python for a churn model used by 40 account managers.

SKILLS
SQL, Python, Looker, Excel`;

beforeEach(() => {
  vi.mocked(roomForResume).mockResolvedValue(true);
  store().clearAll();
  store().setStep("upload");
});

afterEach(() => {
  vi.clearAllMocks();
  clearHandedUpload();
});

describe("openStudioWith", () => {
  it("turns pasted text into a resume, opens Fix and keeps the job post for Tailor", async () => {
    expect(await openStudioWith({ text: RESUME, sample: false, job })).toBe(true);
    const resume = store().resumes[store().activeId ?? ""];
    expect(resume?.basics.name).toBe("Priya Raman");
    expect(resume?.experience[0]?.company).toBe("Lumen Health");
    expect(resume?.experience[0]?.bullets).toHaveLength(2);
    expect(store().step).toBe("fix");
    expect(setTailorDraft).toHaveBeenCalledExactlyOnceWith(job);
    expect(track).toHaveBeenCalledWith("resume_imported", { source: "paste" });
  });

  it("opens the real sample resume, not a reading of its text", async () => {
    const { resume: text } = sampleTexts();
    expect(await openStudioWith({ text, sample: true, job })).toBe(true);
    const resume = store().resumes[store().activeId ?? ""];
    expect(resume?.source).toBe("sample");
    expect(resume?.skills).toHaveLength(2);
    expect(store().step).toBe("fix");
    expect(track).toHaveBeenCalledWith("resume_imported", { source: "sample" });
  });

  it("opens the sample in its own slot, reusing the one already here", async () => {
    vi.mocked(roomForResume).mockResolvedValue(false);
    const { resume: text } = sampleTexts();
    expect(await openStudioWith({ text, sample: true, job })).toBe(true);
    expect(await openStudioWith({ text, sample: true, job })).toBe(true);
    expect(store().order).toHaveLength(1);
    expect(roomForResume).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledTimes(1);
    expect(setTailorDraft).toHaveBeenCalledTimes(2);
  });

  it("hands a file to the Upload step with the job post", async () => {
    const file = new File(["%PDF-1.7"], "cv.pdf", { type: "application/pdf" });
    expect(await openStudioWith({ file, job })).toBe(true);
    expect(handedUpload()).toBe(file);
    expect(store().step).toBe("upload");
    expect(store().order).toHaveLength(0);
    expect(setTailorDraft).toHaveBeenCalledExactlyOnceWith(job);
  });

  it("hands the home page's file to Upload and leaves Tailor alone", async () => {
    const file = new File(["%PDF-1.7"], "cv.pdf", { type: "application/pdf" });
    expect(await openStudioWithFile(file)).toBe(true);
    expect(handedUpload()).toBe(file);
    expect(store().step).toBe("upload");
    expect(setTailorDraft).not.toHaveBeenCalled();
  });

  it("changes nothing when there is no room for another resume", async () => {
    vi.mocked(roomForResume).mockResolvedValue(false);
    const retry = vi.fn();
    expect(await openStudioWith({ text: RESUME, sample: false, job }, retry)).toBe(false);
    expect(roomForResume).toHaveBeenCalledWith(retry);
    expect(store().order).toHaveLength(0);
    expect(store().step).toBe("upload");
    expect(setTailorDraft).not.toHaveBeenCalled();
  });
});
