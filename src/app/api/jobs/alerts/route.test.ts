import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import type { JobAlertsResponse } from "@/lib/job-feed/alert-types";
import { DEFAULT_FILTERS, NO_CHOICE } from "@/lib/job-feed/types";
import { DELETE as remove } from "./[id]/route";
import { GET as list, POST as add } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const post = (body: unknown) =>
  add(
    new Request("http://localhost/api/jobs/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const ALERT = { name: "Backend · Berlin", filters: DEFAULT_FILTERS, choice: NO_CHOICE };

describe("job alerts routes", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("are for Pro, like filters", async () => {
    await signInAs();
    expect((await post(ALERT)).status).toBe(402);
  });

  it("add, list and remove an alert, and turn away a point", async () => {
    await setPlan(await signInAs(), "pro");
    const added = await post(ALERT);
    expect(added.status).toBe(200);
    const [alert] = ((await added.json()) as JobAlertsResponse).alerts;
    expect(alert).toMatchObject({ name: "Backend · Berlin", checkedAt: null });

    const listed = (await (await list()).json()) as JobAlertsResponse;
    expect(listed.alerts.map((item) => item.id)).toEqual([alert!.id]);

    const near = {
      ...ALERT,
      filters: { ...DEFAULT_FILTERS, near: { lat: 52.52, lng: 13.4, km: 25 } },
    };
    expect((await post(near)).status).toBe(400);

    const gone = await remove(
      new Request(`http://localhost/api/jobs/alerts/${alert!.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: alert!.id }) },
    );
    expect(((await gone.json()) as JobAlertsResponse).alerts).toEqual([]);
  });
});
