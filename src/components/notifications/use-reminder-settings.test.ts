import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReminderSettingsResponse } from "@/lib/notifications/types";
import { queryKeys } from "@/lib/queries/keys";
import type { ReminderSettingsData } from "@/lib/queries/options";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  isServer: false,
}));
const api = vi.hoisted(() => ({ saveReminderSettings: vi.fn() }));
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
const { saveReminderSettings } = await import("./use-reminder-settings");

const KEY = queryKeys.reminderSettings("ada");
const START: ReminderSettingsData = {
  emailAvailable: true,
  chosen: false,
  promptSnoozed: false,
  emailReminders: false,
  followUpDays: 7,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const reply = (settings: Partial<ReminderSettingsData>): ReminderSettingsResponse => ({
  ok: true,
  emailAvailable: true,
  chosen: true,
  promptSnoozed: false,
  emailReminders: false,
  followUpDays: 7,
  ...settings,
});
const shown = () => getQueryClient().getQueryData<ReminderSettingsData>(KEY);

beforeEach(() => {
  getQueryClient().clear();
  getQueryClient().setQueryData(KEY, START);
  vi.clearAllMocks();
});

describe("saveReminderSettings", () => {
  it("shows the change before the server answers, then the server's copy", async () => {
    const answer = deferred<ReminderSettingsResponse>();
    api.saveReminderSettings.mockReturnValue(answer.promise);
    const saving = saveReminderSettings("ada", { followUpDays: 14 });
    expect(shown()).toMatchObject({ followUpDays: 14, chosen: true });

    answer.resolve(reply({ followUpDays: 14 }));
    await expect(saving).resolves.toMatchObject({ followUpDays: 14 });
    expect(shown()).toEqual({ ...START, chosen: true, followUpDays: 14 });
  });

  it("puts back what was shown when the save fails", async () => {
    api.saveReminderSettings.mockRejectedValue(new ApiClientError("server_error", "No", 500));
    await expect(saveReminderSettings("ada", { emailReminders: true })).rejects.toThrow("No");
    expect(shown()).toEqual(START);
  });

  it("sends quick changes one after another, in order", async () => {
    const first = deferred<ReminderSettingsResponse>();
    api.saveReminderSettings
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(reply({ followUpDays: 21 }));
    const a = saveReminderSettings("ada", { followUpDays: 14 });
    const b = saveReminderSettings("ada", { followUpDays: 21 });
    expect(shown()?.followUpDays).toBe(21);
    await Promise.resolve();
    expect(api.saveReminderSettings).toHaveBeenCalledTimes(1);

    first.resolve(reply({ followUpDays: 14 }));
    await Promise.all([a, b]);
    expect(api.saveReminderSettings.mock.calls).toEqual([
      [{ followUpDays: 14 }],
      [{ followUpDays: 21 }],
    ]);
    expect(shown()?.followUpDays).toBe(21);
  });

  it("rests the card on Not now without making a choice", async () => {
    api.saveReminderSettings.mockResolvedValue(reply({ chosen: false, promptSnoozed: true }));
    const saving = saveReminderSettings("ada", { snoozePrompt: true });
    expect(shown()).toEqual({ ...START, promptSnoozed: true });
    await expect(saving).resolves.toEqual({ ...START, promptSnoozed: true });
    expect(api.saveReminderSettings).toHaveBeenCalledWith({ snoozePrompt: true });
  });
});
