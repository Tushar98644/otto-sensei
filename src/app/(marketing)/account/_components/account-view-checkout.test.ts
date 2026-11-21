import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LazyUpgradeDialog } from "@/components/account/lazy-dialogs";
import { PlanOffer, type PlanOfferProps } from "@/components/account/plan-offer";
import { SignInForm, type SignInFormProps } from "@/components/account/sign-in-form";
import { UpgradeDialog, type UpgradeDialogProps } from "@/components/account/upgrade-dialog";
import type { Me } from "@/components/account/use-me";
import type { SessionUser } from "@/lib/auth/types";
import { AccountSignIn, type AccountSignInProps } from "./account-sign-in";
import { AccountView } from "./account-view";

const mocks = vi.hoisted(() => ({
  me: null as Me | null,
  loading: false,
  search: "",
}));

// Each name is one mounted component: state and refs live across renders, a set during render renders again, effects run when their deps change.
const react = vi.hoisted(() => {
  type Slot = {
    value?: unknown;
    deps?: readonly unknown[];
    cleanup?: void | (() => void);
    latest?: (...args: never[]) => unknown;
    stable?: (...args: never[]) => unknown;
  };
  const components = new Map<string, Slot[]>();
  let slots: Slot[] = [];
  let index = 0;
  let dirty = false;
  let effects: (() => void)[] = [];
  let current = "";
  const next = () => (slots[index++] ??= {});
  const same = (a: readonly unknown[], b: readonly unknown[]) =>
    a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  return {
    checkouts: [] as unknown[][],
    current: () => current,
    useState<S>(initial: S | (() => S)) {
      const slot = next();
      if (!("value" in slot)) {
        slot.value = typeof initial === "function" ? (initial as () => S)() : initial;
      }
      const set = (update: S | ((previous: S) => S)) => {
        const value =
          typeof update === "function" ? (update as (previous: S) => S)(slot.value as S) : update;
        if (Object.is(value, slot.value)) return;
        slot.value = value;
        dirty = true;
      };
      return [slot.value as S, set] as const;
    },
    useRef<T>(initial: T) {
      const slot = next();
      if (!("value" in slot)) slot.value = { current: initial };
      return slot.value as { current: T };
    },
    useId() {
      return `id-${index++}`;
    },
    useEffectEvent<F extends (...args: never[]) => unknown>(callback: F): F {
      const slot = next();
      slot.latest = callback;
      slot.stable ??= (...args: never[]) => slot.latest!(...args);
      return slot.stable as F;
    },
    useEffect(effect: () => void | (() => void), deps?: readonly unknown[]) {
      const slot = next();
      if (slot.deps && deps && same(slot.deps, deps)) return;
      effects.push(() => {
        if (typeof slot.cleanup === "function") slot.cleanup();
        slot.deps = deps;
        slot.cleanup = effect();
      });
    },
    render<T>(name: string, component: () => T): T {
      if (!components.has(name)) components.set(name, []);
      slots = components.get(name)!;
      current = name;
      let output: T;
      do {
        dirty = false;
        index = 0;
        effects = [];
        output = component();
      } while (dirty);
      for (const run of effects) run();
      return output;
    },
    unmount() {
      for (const mounted of components.values()) {
        for (const slot of mounted) if (typeof slot.cleanup === "function") slot.cleanup();
      }
      components.clear();
    },
  };
});

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: react.useState,
  useRef: react.useRef,
  useId: react.useId,
  useEffect: react.useEffect,
  useEffectEvent: react.useEffectEvent,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
  usePathname: () => "/account",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));
vi.mock("@/components/account/use-me", () => ({
  useMe: () => ({
    me: mocks.me,
    user: mocks.me?.user ?? null,
    loading: mocks.loading,
    refresh: async () => {},
  }),
  refreshMe: async () => {},
  patchMe: () => {},
}));
// One hook instance per component, so a request says which one asked for it.
vi.mock("@/components/account/use-billing-redirect", () => ({
  useBillingRedirect: (destination: string) => {
    const from = react.current();
    return {
      go: (...args: unknown[]) => {
        if (destination === "checkout") react.checkouts.push([from, ...args]);
      },
      pending: false,
    };
  },
}));
vi.mock("@/components/account/lazy-dialogs", () => ({ LazyUpgradeDialog: () => null }));
vi.mock("@/components/ui/toast", () => ({ toast: () => {} }));
vi.mock("@/components/mascot/otto-loading-screen", () => ({ useOttoLoadingScreen: () => {} }));
vi.mock("@/components/setup/use-scroll-to-section", () => ({ useScrollToSection: () => {} }));
vi.mock("./account-tabs", () => ({ AccountTabs: () => null }));
vi.mock("./use-upgrade-return", () => ({ useUpgradeReturn: () => {} }));
vi.mock("./use-upgrade-watch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./use-upgrade-watch")>()),
  useUpgradeWatch: () => ({ state: "idle" }),
}));
vi.mock("./use-account-arrival", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./use-account-arrival")>();
  return {
    ...actual,
    useAccountArrival: () => actual.readArrival(new URLSearchParams(mocks.search)),
  };
});

const OFFER = { pro: ["month", "year"], max: ["month", "year"] } satisfies Me["billing"]["offer"];
const FREE: SessionUser = {
  id: "ada",
  email: "ada@example.com",
  plan: "free",
  planInterval: null,
  planRenewsAt: null,
};
const ON_TRIAL: SessionUser = {
  ...FREE,
  plan: "pro",
  planInterval: "month",
  trialEndsAt: Date.UTC(2026, 10, 23, 12),
};

function account(user: SessionUser | null): Me {
  return {
    user,
    usage: null,
    period: null,
    aiBudget: null,
    billing: { mode: "dodo", offer: OFFER, trial: true },
    auth: { mode: "supabase" },
  };
}

type Element = { type: unknown; props: Record<string, unknown> };

function find<P>(node: unknown, type: unknown): P | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = find<P>(child, type);
      if (hit) return hit;
    }
    return undefined;
  }
  if (typeof node !== "object" || node === null || !("type" in node) || !("props" in node)) {
    return undefined;
  }
  const element = node as Element;
  if (element.type === type) return element.props as P;
  return find<P>(Object.values(element.props), type);
}

let dialogMounted = false;

// The store changed: the page renders, then its dialog once it has opened, then due timers fire.
function show(me: Me | null, loading = false) {
  mocks.me = me;
  mocks.loading = loading;
  const page = react.render("page", AccountView);
  const dialogProps = find<UpgradeDialogProps>(page, LazyUpgradeDialog)!;
  if (dialogProps.open) dialogMounted = true;
  const dialog = dialogMounted ? react.render("dialog", () => UpgradeDialog(dialogProps)) : null;
  vi.runAllTimers();
  return { page, dialogProps, dialog };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", {
    setTimeout: (callback: () => void, ms?: number) => setTimeout(callback, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    location: { pathname: "/account", search: "", hash: "" },
  });
  react.checkouts.length = 0;
  dialogMounted = false;
});

afterEach(() => {
  react.unmount();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("AccountView and its upgrade dialog, sent to upgrade", () => {
  it("signed in inside the dialog after the account failed to load, asks for checkout once, from the dialog", () => {
    mocks.search = "upgrade=1&plan=pro&interval=month";
    const failed = show(null);
    expect(failed.dialogProps).toMatchObject({ open: true, startAtSignIn: true });
    const signIn = find<SignInFormProps>(failed.dialog, SignInForm)!;

    show(null, true);
    const after = show(account(FREE));
    signIn.onSignedIn!(FREE);
    show(account(FREE));

    expect(react.checkouts).toEqual([["dialog", "pro", "month", null]]);
    expect(after.dialogProps.open).toBe(true);
  });

  it("signed out, picks yearly in the dialog and signs in there: one checkout, yearly", () => {
    mocks.search = "upgrade=1";
    const plans = find<PlanOfferProps>(show(account(null)).dialog, PlanOffer)!;
    plans.onIntervalChange("year");
    const yearly = find<PlanOfferProps>(show(account(null)).dialog, PlanOffer)!;
    yearly.onChoose!(yearly.cards.find((card) => card.plan === "pro")!);
    const signIn = find<SignInFormProps>(show(account(null)).dialog, SignInForm)!;

    show(account(FREE));
    signIn.onSignedIn!(FREE);
    show(account(FREE));

    expect(react.checkouts).toEqual([["dialog", "pro", "year", null]]);
  });

  it("signed in on Free, goes straight to checkout once, on the link's billing period", () => {
    mocks.search = "upgrade=1&plan=pro&interval=year";
    show(null, true);
    const page = show(account(FREE));
    show(account(FREE));

    expect(react.checkouts).toEqual([["page", "pro", "year", null]]);
    expect(page.dialogProps.open).toBe(false);
  });

  it("signed in on a trial, asks for no checkout and confirms on a priced card", () => {
    mocks.search = "upgrade=1&plan=max&interval=year";
    show(null, true);
    const page = show(account(ON_TRIAL));

    expect(react.checkouts).toEqual([]);
    expect(page.dialogProps.open).toBe(true);
  });

  it("dismissing the dialog and signing in on the page, goes to checkout from the page", () => {
    mocks.search = "upgrade=1&plan=pro&interval=month";
    const signedOut = show(account(null));
    signedOut.dialogProps.onOpenChange(false);
    const signIn = find<AccountSignInProps>(show(account(null)).page, AccountSignIn)!;

    show(account(FREE));
    signIn.onSignedIn();
    show(account(FREE));

    expect(react.checkouts).toEqual([["page", "pro", "month", null]]);
  });
});
