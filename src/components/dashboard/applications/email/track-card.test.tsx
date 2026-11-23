import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GMAIL_FILTER,
  GMAIL_FILTER_FILE,
  GMAIL_FILTERS_URL,
  GMAIL_FORWARDING_URL,
  gmailSearchUrl,
} from "@/lib/inbound/gmail-filter";
import type { TrackingAddress } from "@/lib/inbound/types";
import type { GmailButtonProps } from "./gmail-button";
import { SetupSteps } from "./track-card";

const mocks = vi.hoisted(() => ({
  buttons: [] as GmailButtonProps[],
  copyText: vi.fn(async () => true),
  saveFile: vi.fn(() => true),
  watchForMail: vi.fn(),
  trackingAction: vi.fn(async () => true),
}));

vi.mock("@/components/ui/copy-text", () => ({ copyText: mocks.copyText }));

vi.mock("./gmail-button", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./gmail-button")>();
  return {
    ...actual,
    saveFile: mocks.saveFile,
    GmailButton: (props: GmailButtonProps) => {
      mocks.buttons.push(props);
      return actual.GmailButton(props);
    },
  };
});

vi.mock("./use-email-tracking", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./use-email-tracking")>()),
  watchForMail: mocks.watchForMail,
  trackingAction: mocks.trackingAction,
}));

const ADDRESS: TrackingAddress = {
  email: "otto+priya@track.ottosensei.com",
  handle: "priya",
  sources: [],
  createdAt: 1,
  confirm: null,
  confirmedAt: null,
  testAt: null,
  lastEmailAt: null,
};
const ASKED: TrackingAddress = {
  ...ADDRESS,
  confirm: {
    code: "123456789",
    url: "https://mail-settings.google.com/mail/vf-abc",
    at: 2,
    source: "priya@gmail.com",
  },
};
const CONFIRMED: TrackingAddress = { ...ASKED, confirmedAt: 3 };
const WORKING: TrackingAddress = { ...CONFIRMED, lastEmailAt: 4 };

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&#x27;", "'")
    .replace(/\s+/g, " ");

function render(address: TrackingAddress) {
  mocks.buttons.length = 0;
  return renderToStaticMarkup(<SetupSteps address={address} userId="u1" />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the setup steps", () => {
  it("opens only step 1 with one Gmail action, the clip and five short sub-steps", () => {
    const html = render(ADDRESS);
    expect(text(html)).toContain("Step 1 of 3");
    expect(html).toContain("Press <strong");
    for (const name of [
      "Forwarding and POP/IMAP",
      "Add a forwarding address",
      "Next",
      "Proceed",
      "OK",
    ]) {
      expect(html).toMatch(new RegExp(`<strong[^>]*>${name}</strong>`));
    }
    expect(text(html)).toContain("Paste your address and press Next .");
    expect(text(html)).not.toContain("Copy filter and open Gmail search");
    expect(text(html)).not.toContain("Is this your Gmail?");
    expect(mocks.buttons.map((b) => [b.href, b.main])).toEqual([[GMAIL_FORWARDING_URL, true]]);
    expect(html.match(/<video/g)).toHaveLength(1);
    expect(html).toMatch(/<video[^>]*muted[^>]*loop[^>]*playsInline[^>]*preload="none"/i);
    expect(html).toContain('poster="/guides/gmail-forwarding.jpg"');
    expect(html).not.toContain("<source");
  });

  it("lets step 3 be read ahead with Show steps, but never the confirm step", () => {
    const steps = text(render(ADDRESS));
    expect(steps.match(/Show steps/g)).toHaveLength(1);
    expect(steps).toMatch(/Add a filter for job emails Show steps/);
  });

  it("copies the address quietly, watches for Gmail's email and opens Gmail in one press", async () => {
    render(ADDRESS);
    const [open] = mocks.buttons;
    expect(text(renderToStaticMarkup(<>{open!.children}</>))).toBe("Copy address and open Gmail");
    await expect(open!.onPress()).resolves.toBe(true);
    expect(mocks.copyText).toHaveBeenCalledWith(ADDRESS.email, "address", { quiet: true });
    expect(mocks.watchForMail).toHaveBeenCalledOnce();
    expect(open!.doneLabel).toBe("Address copied");
  });

  it("asks before confirming, naming the Gmail that asked", () => {
    const html = render(ASKED);
    expect(html).not.toContain("<video");
    expect(text(html)).toContain("Step 2 of 3");
    expect(text(html)).toContain("Confirm priya@gmail.com");
    expect(html).toContain(`href="${ASKED.confirm!.url}"`);
    expect(mocks.trackingAction).not.toHaveBeenCalled();
    expect(text(html)).not.toContain("Copy address and open Gmail");
  });

  it("opens step 3 with the search way first and a filter file as the other way", async () => {
    const html = render(CONFIRMED);
    expect(text(html)).toContain("Step 3 of 3");
    for (const name of ["Show search options", "Create filter", "Forward it to"]) {
      expect(html).toMatch(new RegExp(`<strong[^>]*>${name}</strong>`));
    }
    for (const name of ["Import filters", "Choose File", "Open file", "Create filters"]) {
      expect(html).toMatch(new RegExp(`<strong[^>]*>${name}</strong>`));
    }
    const [search, file] = mocks.buttons;
    expect([search!.href, search!.main]).toEqual([gmailSearchUrl(), true]);
    expect([file!.href, file!.main ?? false]).toEqual([GMAIL_FILTERS_URL, false]);

    await search!.onPress();
    expect(mocks.copyText).toHaveBeenCalledWith(GMAIL_FILTER, "filter", { quiet: true });
    expect(file!.onPress()).toBe(true);
    const [name, xml, type] = mocks.saveFile.mock.calls[0] as unknown as [string, string, string];
    expect([name, type]).toEqual([GMAIL_FILTER_FILE, "application/xml"]);
    expect(xml).toContain(`name="forwardTo" value="${CONFIRMED.email}"`);
  });

  it("folds every step once job emails come in", () => {
    const html = render(WORKING);
    expect(text(html)).toContain("All set");
    expect(text(html).match(/\(done\)/g)).toHaveLength(3);
    expect(mocks.buttons).toHaveLength(0);
    expect(text(html)).toContain("Send a test");
  });
});
