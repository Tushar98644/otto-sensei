import type { MouseEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReminderPage from "../page";
import {
  confirmMessage,
  MISSING_PART,
  REMINDER_CONFIRM,
  ReminderAction,
  sendReminderAction,
  type ReminderRequest,
} from "./reminder-action";

const presses = vi.hoisted(
  () => [] as Array<((event: MouseEvent<HTMLButtonElement>) => void) | undefined>,
);

vi.mock("@/components/ui/button", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/button")>();
  return {
    ...actual,
    Button: (props: Parameters<typeof actual.Button>[0]) => {
      presses.push(props.onClick);
      return actual.Button(props);
    },
  };
});

const U = "8f0c2b52-4d1f-4c0a-9a3e-2f1d6c7b8a90";
const A = "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d";
const T = "A".repeat(43);

const REQUESTS: Record<ReminderRequest["kind"], ReminderRequest> = {
  done: { kind: "done", u: U, a: A, t: T },
  snooze: { kind: "snooze", u: U, a: A, t: T },
  unsubscribe: { kind: "unsubscribe", u: U, t: T },
};

const fetchMock = vi.fn<typeof fetch>();
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&#x27;", "'")
    .replace(/\s+/g, " ");

function press() {
  expect(presses).toHaveLength(1);
  presses[0]?.({} as MouseEvent<HTMLButtonElement>);
}

beforeEach(() => {
  presses.length = 0;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ReminderAction", () => {
  it.each(Object.keys(REQUESTS) as ReminderRequest["kind"][])(
    "asks before it acts on %s and sends nothing when the page opens",
    (kind) => {
      const html = renderToStaticMarkup(<ReminderAction request={REQUESTS[kind]} />);
      expect(html.match(/<button/g)).toHaveLength(1);
      expect(text(html)).toContain(REMINDER_CONFIRM[kind].label);
      expect(text(html)).toContain(REMINDER_CONFIRM[kind].message);
      expect(html).not.toContain("Saving that");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("posts the signed follow-up action only once the button is pressed", () => {
    fetchMock.mockResolvedValue(
      Response.json({ ok: true, company: "Northwind", followUpAt: null }),
    );
    renderToStaticMarkup(<ReminderAction request={REQUESTS.done} />);
    expect(fetchMock).not.toHaveBeenCalled();
    press();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/notifications/follow-up");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ u: U, a: A, act: "done", t: T });
  });

  it("sends an unsubscribe press to the same endpoint mail apps use for one-click", () => {
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    renderToStaticMarkup(<ReminderAction request={REQUESTS.unsubscribe} />);
    expect(fetchMock).not.toHaveBeenCalled();
    press();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`/api/notifications/unsubscribe?u=${U}&t=${T}`);
    expect(init?.method).toBe("POST");
  });

  it("offers only the way back to applications when the link is missing a part", () => {
    const html = renderToStaticMarkup(<ReminderAction request={null} />);
    expect(html).not.toContain("<button");
    expect(text(html)).toContain(MISSING_PART);
    expect(html).toContain('href="/dashboard/applications"');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("sendReminderAction", () => {
  it("says what changed, from the server's answer", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ ok: true, company: "Northwind", followUpAt: null }),
    );
    await expect(sendReminderAction(REQUESTS.done)).resolves.toBe(
      "Marked done. I won't remind you about Northwind again.",
    );
    fetchMock.mockResolvedValueOnce(
      Response.json({ ok: true, company: "Ledgerly", followUpAt: Date.UTC(2026, 10, 20, 12) }),
    );
    await expect(sendReminderAction(REQUESTS.snooze)).resolves.toMatch(
      /^Snoozed for 3 days\. I'll remind you about Ledgerly on \w+, Nov \d+\.$/,
    );
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));
    await expect(sendReminderAction(REQUESTS.unsubscribe)).resolves.toContain(
      "You won't get reminder emails any more.",
    );
  });

  it("passes on the server's reason when it refuses", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { ok: false, error: { message: "That reminder link isn't valid any more." } },
        { status: 400 },
      ),
    );
    await expect(sendReminderAction(REQUESTS.snooze)).rejects.toThrow(
      "That reminder link isn't valid any more.",
    );
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 400 }));
    await expect(sendReminderAction(REQUESTS.unsubscribe)).rejects.toThrow(
      "That unsubscribe link isn't valid.",
    );
  });
});

describe("confirmMessage", () => {
  const job = { company: "Northwind", role: "Product Designer" };

  it("names the company and role it's asking about", () => {
    expect(confirmMessage("done", job)).toBe(
      "Followed up with Northwind about the Product Designer job? Mark it done and I'll stop reminding you.",
    );
    expect(confirmMessage("done", { company: "Northwind", role: " " })).toBe(
      "Followed up with Northwind? Mark it done and I'll stop reminding you.",
    );
    expect(confirmMessage("snooze", job)).toBe(
      "Not ready to follow up with Northwind yet? I'll remind you again in 3 days.",
    );
  });

  it("falls back to the plain question when the job can't be read", () => {
    for (const kind of ["done", "snooze", "unsubscribe"] as const) {
      expect(confirmMessage(kind, null)).toBe(REMINDER_CONFIRM[kind].message);
    }
    expect(confirmMessage("done", { company: "", role: "Designer" })).toBe(
      REMINDER_CONFIRM.done.message,
    );
    expect(confirmMessage("unsubscribe", job)).toBe(REMINDER_CONFIRM.unsubscribe.message);
  });

  it("shows the job on the confirm screen", () => {
    const html = renderToStaticMarkup(<ReminderAction request={REQUESTS.done} job={job} />);
    expect(text(html)).toContain("Followed up with Northwind about the Product Designer job?");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("/reminder", () => {
  it.each([
    [{ do: "done", u: U, a: A, t: T }, "Mark done"],
    [{ do: "snooze", u: U, a: A, t: T }, "Snooze 3 days"],
    [{ do: "unsubscribe", u: U, t: T }, "Turn off reminder emails"],
  ])("renders one confirm button for %o and sends nothing", async (params, label) => {
    const page = await ReminderPage({ searchParams: Promise.resolve(params) });
    const html = renderToStaticMarkup(page);
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(text(html)).toContain(label);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
