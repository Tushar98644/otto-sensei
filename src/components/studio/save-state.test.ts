import { describe, expect, it } from "vitest";
import { isSaveProblem, SAVE_COPY, saveState } from "./save-state";

describe("saveState", () => {
  it("says saving while this browser's save waits out the pause", () => {
    expect(saveState("pending", "saved", true)).toBe("saving");
    expect(saveState("pending", "local", false)).toBe("saving");
    expect(SAVE_COPY.saving.label).toBe("Saving…");
  });

  it("says saved on this device when signed out", () => {
    expect(saveState("saved", "local", false)).toBe("device");
    expect(SAVE_COPY.device.label).toBe("Saved on this device");
  });

  it("waits for the backup before saying saved when signed in", () => {
    expect(saveState("saved", "saving", true)).toBe("saving");
    expect(saveState("saved", "saved", true)).toBe("saved");
    expect(SAVE_COPY.saved.label).toBe("Saved");
  });

  it("owns up to a failed backup, and to a resume that is only on this device", () => {
    expect(saveState("saved", "failed", true)).toBe("retrying");
    expect(saveState("saved", "local", true)).toBe("local");
    expect(isSaveProblem("retrying")).toBe(true);
    expect(isSaveProblem("local")).toBe(false);
  });

  it("says not saved when the browser keeps nothing and the account has nothing newer", () => {
    expect(saveState("failed", "local", false)).toBe("unsaved");
    expect(saveState("failed", "failed", true)).toBe("unsaved");
    expect(saveState("failed", "saved", true)).toBe("saved");
    expect(isSaveProblem("unsaved")).toBe(true);
  });
});
