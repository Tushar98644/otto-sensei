import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MeState } from "@/components/account/use-me";
import { PLANS } from "@/config/plans";
import en from "@/i18n/messages/en";
import {
  MAX_REWARDED_REFERRALS,
  REFERRAL_BONUS,
  type ReferralSummary,
} from "@/lib/referrals/referrals";
import { extrasNote } from "./invite-card";
import { InviteOffer, inviteText } from "./invite-prompt";

const INVITE_PROMPT_TEXT = inviteText(en.shareLinks.invite);
const INVITE_ANNOUNCEMENT = en.shareLinks.invite.announcement;

const mocks = vi.hoisted(() => ({ meSnapshot: vi.fn(), referrals: vi.fn() }));

vi.mock("@/components/account/use-me", () => ({ meSnapshot: mocks.meSnapshot }));
vi.mock("@/lib/api/client", () => ({ api: { referrals: mocks.referrals } }));

const INVITE_URL = "https://otto.example/?ref=abcd2345";

function summary(rewarded = 0): ReferralSummary {
  return {
    code: "abcd2345",
    url: INVITE_URL,
    joined: rewarded,
    checked: rewarded,
    rewarded,
    maxRewarded: MAX_REWARDED_REFERRALS,
    perFriend: REFERRAL_BONUS,
    thisPeriod: { fix: 0, tailor: 0 },
    period: "month",
  };
}

const signedIn = { status: "ready", me: { user: { id: "u1" } } } as unknown as MeState;
const signedOut = { status: "ready", me: { user: null } } as unknown as MeState;

// A fresh module each time, as a new page load would give.
let inviteToOffer: typeof import("./invite-prompt").inviteToOffer;

beforeEach(async () => {
  const stored = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => void stored.set(key, value),
      removeItem: (key: string) => void stored.delete(key),
    },
  });
  mocks.meSnapshot.mockReset().mockReturnValue(signedIn);
  mocks.referrals.mockReset().mockResolvedValue({ ok: true, referrals: summary() });
  vi.resetModules();
  ({ inviteToOffer } = await import("./invite-prompt"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("inviteToOffer", () => {
  it("offers the invite once a session, after the first download", async () => {
    expect(await inviteToOffer()).toBe(INVITE_URL);
    expect(await inviteToOffer()).toBeNull();
    expect(mocks.referrals).toHaveBeenCalledTimes(1);
  });

  it("still offers it only once a page load when session storage is blocked", async () => {
    vi.stubGlobal("window", {
      get sessionStorage(): Storage {
        throw new Error("blocked");
      },
    });
    expect(await inviteToOffer()).toBe(INVITE_URL);
    expect(await inviteToOffer()).toBeNull();
    expect(mocks.referrals).toHaveBeenCalledTimes(1);
  });

  it("skips signed-out visitors without asking the server", async () => {
    mocks.meSnapshot.mockReturnValue(signedOut);
    expect(await inviteToOffer()).toBeNull();
    expect(mocks.referrals).not.toHaveBeenCalled();
  });

  it("stays quiet when the inviter earns nothing more", async () => {
    mocks.referrals.mockResolvedValueOnce({ ok: true, referrals: summary(MAX_REWARDED_REFERRALS) });
    expect(await inviteToOffer()).toBeNull();
  });

  it("stays quiet when the link can't load", async () => {
    mocks.referrals.mockRejectedValueOnce(new Error("offline"));
    expect(await inviteToOffer()).toBeNull();
  });
});

describe("InviteOffer", () => {
  it("keeps an empty live region in place until there's an invite to offer", () => {
    expect(renderToStaticMarkup(<InviteOffer url={null} onDismiss={() => {}} />)).toBe(
      '<p class="sr-only" aria-live="polite"></p>',
    );
  });

  it("announces one line, and shows the prompt outside the live region", () => {
    const html = renderToStaticMarkup(<InviteOffer url={INVITE_URL} onDismiss={() => {}} />);
    expect(
      html.startsWith(`<p class="sr-only" aria-live="polite">${INVITE_ANNOUNCEMENT}</p><section`),
    ).toBe(true);
    expect(INVITE_PROMPT_TEXT).toBe(
      `Share your link: when they sign up and check a resume, you both get ${REFERRAL_BONUS.fix} more line fixes, plus ${REFERRAL_BONUS.tailor} tailored versions on Pro or Max.`,
    );
    expect(html).toContain("Know someone job hunting?");
    expect(html).toContain("Copy invite link");
    expect(html).toContain('aria-label="Dismiss the invite"');
  });
});

describe("extrasNote", () => {
  it("tells Free its line fixes count now and its tailored versions wait for Pro", () => {
    const free = extrasNote(en.account.invite, "free", "month");
    expect(free).toContain(
      `each friend adds ${REFERRAL_BONUS.fix} line fixes to that month's ${PLANS.free.limits.fix}`,
    );
    expect(free).toContain(`the ${REFERRAL_BONUS.tailor} tailored versions wait`);
    expect(extrasNote(en.account.invite, "pro", "trial")).toContain(
      "carry into your first paid month",
    );
    expect(extrasNote(en.account.invite, "max", "month")).toBe("Extras add to your Max limits.");
  });
});
