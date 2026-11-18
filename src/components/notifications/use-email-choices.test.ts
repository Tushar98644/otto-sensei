import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailChoicesResponse } from "@/lib/notifications/types";
import type { EmailChoicesData } from "./use-email-choices";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  isServer: false,
}));
const api = vi.hoisted(() => ({ saveEmailChoices: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));
vi.mock("@/components/account/use-me", () => ({
  signedInUserId: () => "ada",
  subscribeToMe: () => () => {},
}));

const { ApiClientError } = await import("@/lib/api/client");
const { getQueryClient } = await import("@/lib/queries/client");
const { saveEmailChoices } = await import("./use-email-choices");

const KEY = ["email-choices", "ada"];
const START: EmailChoicesData = {
  emailAvailable: true,
  jobEmails: false,
  tipEmails: true,
  jobPromptClosed: false,
};
const shown = () => getQueryClient().getQueryData<EmailChoicesData>(KEY);

beforeEach(() => {
  getQueryClient().clear();
  getQueryClient().setQueryData(KEY, START);
  vi.clearAllMocks();
});

describe("saveEmailChoices", () => {
  it("turns the weekly email on at once and closes the Jobs tab's card", async () => {
    const reply: EmailChoicesResponse = {
      ok: true,
      ...START,
      jobEmails: true,
      jobPromptClosed: true,
    };
    api.saveEmailChoices.mockResolvedValue(reply);
    const saving = saveEmailChoices("ada", { jobEmails: true });
    expect(shown()).toEqual({ ...START, jobEmails: true, jobPromptClosed: true });
    await expect(saving).resolves.toEqual({ ...START, jobEmails: true, jobPromptClosed: true });
    expect(api.saveEmailChoices).toHaveBeenCalledWith({ jobEmails: true });
  });

  it("leaves the card alone when only tips change, and puts back what was shown when a save fails", async () => {
    api.saveEmailChoices.mockRejectedValue(new ApiClientError("server_error", "No", 500));
    const saving = saveEmailChoices("ada", { tipEmails: false });
    expect(shown()).toEqual({ ...START, tipEmails: false });
    await expect(saving).rejects.toThrow("No");
    expect(shown()).toEqual(START);
  });
});
