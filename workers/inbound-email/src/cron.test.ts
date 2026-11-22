import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { INTERVIEW_BRIEFS_PATH, runInterviewBriefs } from "./cron";
import worker from "./index";
import type { Env } from "./types";

const ENV: Env = {
  INBOUND_URL: "https://www.ottosensei.com/api/inbound/email",
  INBOUND_DOMAINS: "track.ottosensei.com",
  INBOUND_EMAIL_SECRET: "test-secret-that-is-long-enough-for-otto-1234",
  APP_URL: "https://www.ottosensei.com/",
  CRON_SECRET: "cron-secret-that-is-long-enough",
};

function answer(status: number) {
  return vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => new Response("{}", { status }),
  );
}

describe("the hourly interview run", () => {
  it("calls Otto's interview-briefs cron with the cron secret, as Vercel's crons do", async () => {
    const send = answer(200);
    await runInterviewBriefs(ENV, send as unknown as typeof fetch);
    expect(send).toHaveBeenCalledOnce();
    const [url, init] = send.mock.calls[0]!;
    expect(url).toBe(`https://www.ottosensei.com${INTERVIEW_BRIEFS_PATH}`);
    expect(init!.method).toBe("POST");
    expect(init!.headers).toEqual({ Authorization: "Bearer cron-secret-that-is-long-enough" });
    expect(init!.body).toBeUndefined();
  });

  it("fails loudly on a refused secret or an unfinished run", async () => {
    await expect(runInterviewBriefs(ENV, answer(401) as unknown as typeof fetch)).rejects.toThrow(
      "CRON_SECRET",
    );
    await expect(runInterviewBriefs(ENV, answer(500) as unknown as typeof fetch)).rejects.toThrow(
      "500",
    );
  });

  it("calls nothing until the secret and the site are set", async () => {
    const send = answer(200);
    const unset: Env = { ...ENV, CRON_SECRET: undefined };
    await expect(runInterviewBriefs(unset, send as unknown as typeof fetch)).rejects.toThrow(
      "not set",
    );
    await expect(
      runInterviewBriefs({ ...ENV, APP_URL: " " }, send as unknown as typeof fetch),
    ).rejects.toThrow("not set");
    expect(send).not.toHaveBeenCalled();
  });

  it("runs from the Worker's scheduled handler, at minute 7 of every hour", async () => {
    const send = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    try {
      await worker.scheduled({ cron: "7 * * * *", scheduledTime: 0 }, ENV);
      expect(send.mock.calls[0]![0]).toBe(`https://www.ottosensei.com${INTERVIEW_BRIEFS_PATH}`);
    } finally {
      send.mockRestore();
    }
    const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
    expect(toml).toMatch(/^\[triggers\]\ncrons = \["7 \* \* \* \*"\]$/m);
  });
});
