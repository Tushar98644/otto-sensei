import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BRAND } from "@/config/brand";
import nextConfig from "../../../../next.config";
import {
  CHECKOUT_BLOCKED,
  CHECKOUT_FAILED,
  CHECKOUT_NOT_SET_UP,
} from "./_components/checkout-client";
import {
  checkoutExit,
  checkoutTarget,
  isSandboxToken,
  paddleClientToken,
  type CheckoutTarget,
} from "./_components/checkout-target";
import { openPaddleCheckout, type PaddleEvent, type PaddleJs } from "./_components/paddle-js";
import CheckoutPage from "./page";

const TXN = "txn_01hv8x2kq7m3n4p5r6s7t8v9wa";
const TOKEN = "test_7d279f61a3499fed520f7cd8c08";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("checkoutTarget", () => {
  it("opens our own checkout with the plan it was made for", () => {
    expect(checkoutTarget({ _ptxn: TXN, plan: "pro" })).toEqual({
      transactionId: TXN,
      successPath: "/account?checkout=success&plan=pro",
      cancelPath: "/account?checkout=cancelled",
    });
    expect(checkoutTarget({ _ptxn: TXN, plan: "max" })?.successPath).toBe(
      "/account?checkout=success&plan=max",
    );
  });

  it("keeps the trial on the way back only when the link says trial=1", () => {
    expect(checkoutTarget({ _ptxn: TXN, plan: "pro", trial: "1" })?.successPath).toBe(
      "/account?checkout=success&plan=pro&trial=1",
    );
    for (const trial of ["true", "0", "", ["1", "1"]]) {
      expect(checkoutTarget({ _ptxn: TXN, plan: "pro", trial })?.successPath).toBe(
        "/account?checkout=success&plan=pro",
      );
    }
  });

  it("sends Paddle's own links, which carry no plan we sell, back to the plain account page", () => {
    for (const plan of [undefined, "free", "enterprise", "PRO", ["pro", "max"]]) {
      expect(checkoutTarget({ _ptxn: TXN, plan, trial: "1" })).toEqual({
        transactionId: TXN,
        successPath: "/account",
        cancelPath: "/account",
      });
    }
  });

  it("has nothing to open without one well-formed transaction id", () => {
    for (const _ptxn of [
      undefined,
      "",
      "txn_short",
      TXN.toUpperCase(),
      `${TXN}x`,
      `sub_${TXN.slice(4)}`,
      [TXN, TXN],
    ]) {
      expect(checkoutTarget({ _ptxn, plan: "pro" })).toBeNull();
    }
  });
});

describe("the Paddle.js token", () => {
  it("takes a trimmed test_ or live_ client token and nothing else", () => {
    expect(paddleClientToken(` ${TOKEN} `)).toBe(TOKEN);
    expect(paddleClientToken("live_abc123")).toBe("live_abc123");
    for (const raw of [undefined, "", "  ", "test_", "pdl_sdbx_apikey_x", "live abc"]) {
      expect(paddleClientToken(raw)).toBeNull();
    }
  });

  it("runs Paddle.js in the sandbox only for a test_ token", () => {
    expect(isSandboxToken(TOKEN)).toBe(true);
    expect(isSandboxToken("live_abc123")).toBe(false);
  });
});

describe("checkoutExit", () => {
  const target: CheckoutTarget = {
    transactionId: TXN,
    successPath: "/account?checkout=success&plan=pro&trial=1",
    cancelPath: "/account?checkout=cancelled",
  };

  it("goes to the success page once the checkout completes", () => {
    expect(checkoutExit("checkout.completed", false, target)).toBe(target.successPath);
  });

  it("goes to the cancelled page when the overlay closes before paying", () => {
    expect(checkoutExit("checkout.closed", false, target)).toBe(target.cancelPath);
  });

  it("never calls a paid checkout cancelled when the overlay closes after it", () => {
    expect(checkoutExit("checkout.closed", true, target)).toBeNull();
  });

  it("stays put for every other event", () => {
    for (const event of [
      undefined,
      "checkout.loaded",
      "checkout.error",
      "checkout.payment.failed",
    ]) {
      expect(checkoutExit(event, false, target)).toBeNull();
    }
  });
});

describe("openPaddleCheckout", () => {
  const target: CheckoutTarget = {
    transactionId: TXN,
    successPath: "/account?checkout=success&plan=pro",
    cancelPath: "/account?checkout=cancelled",
  };

  function fakePaddle() {
    const calls: string[] = [];
    let emit: (event: PaddleEvent) => void = () => {};
    const paddle: PaddleJs = {
      Environment: { set: (environment) => calls.push(`environment:${environment}`) },
      Initialize: ({ token, eventCallback }) => {
        calls.push(`initialize:${token}`);
        emit = eventCallback;
      },
      Checkout: {
        open: ({ transactionId, settings }) =>
          calls.push(`open:${transactionId}:${settings.displayMode}:${settings.allowLogout}`),
      },
    };
    const handlers = { loaded: vi.fn(), leave: vi.fn() };
    return { paddle, calls, handlers, emit: (name: string) => emit({ name }) };
  }

  it("picks the sandbox before Initialize for a test_ token, and never for a live_ one", () => {
    const sandbox = fakePaddle();
    openPaddleCheckout(sandbox.paddle, TOKEN, target, sandbox.handlers);
    expect(sandbox.calls).toEqual([
      "environment:sandbox",
      `initialize:${TOKEN}`,
      `open:${TXN}:overlay:false`,
    ]);

    const live = fakePaddle();
    openPaddleCheckout(live.paddle, "live_abc123", target, live.handlers);
    expect(live.calls).toEqual(["initialize:live_abc123", `open:${TXN}:overlay:false`]);
  });

  it("leaves for the success page on completion and ignores the close that follows", () => {
    const fake = fakePaddle();
    openPaddleCheckout(fake.paddle, TOKEN, target, fake.handlers);
    fake.emit("checkout.loaded");
    expect(fake.handlers.loaded).toHaveBeenCalledOnce();
    expect(fake.handlers.leave).not.toHaveBeenCalled();
    fake.emit("checkout.completed");
    fake.emit("checkout.closed");
    expect(fake.handlers.leave.mock.calls).toEqual([[target.successPath]]);
  });

  it("leaves for the cancelled page when the overlay closes unpaid", () => {
    const fake = fakePaddle();
    openPaddleCheckout(fake.paddle, TOKEN, target, fake.handlers);
    fake.emit("checkout.payment.failed");
    fake.emit("checkout.closed");
    expect(fake.handlers.leave.mock.calls).toEqual([[target.cancelPath]]);
  });
});

describe("CheckoutPage", () => {
  const render = async (params: Record<string, string>) =>
    renderToStaticMarkup(await CheckoutPage({ searchParams: Promise.resolve(params) })).replaceAll(
      "&#x27;",
      "'",
    );

  it("sends a visit with no transaction to pricing", async () => {
    await expect(CheckoutPage({ searchParams: Promise.resolve({}) })).rejects.toMatchObject({
      digest: expect.stringMatching(/^NEXT_REDIRECT;\w+;\/pricing;30\d;$/),
    });
    await expect(
      CheckoutPage({ searchParams: Promise.resolve({ _ptxn: "txn_bad", plan: "pro" }) }),
    ).rejects.toMatchObject({ digest: expect.stringContaining(";/pricing;") });
  });

  it("renders signed out, without asking for a session, while Paddle.js loads", async () => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", TOKEN);
    const html = await render({ _ptxn: TXN, plan: "pro" });
    expect(html).toContain("Checkout</h1>");
    expect(html).toContain("Your checkout opens on this page.");
    expect(html).not.toContain(CHECKOUT_FAILED);
  });

  it("says so, with the support email, when there is no client token to open Paddle.js with", async () => {
    vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "");
    const html = await render({ _ptxn: TXN, plan: "pro" });
    expect(html).toContain(CHECKOUT_FAILED);
    expect(html).toContain(CHECKOUT_NOT_SET_UP);
    expect(html).not.toContain(CHECKOUT_BLOCKED);
    expect(html).toContain(BRAND.supportEmail);
    expect(html).toContain('href="/account"');
    expect(html).not.toContain("Try again");
  });

  it("has a noindex tag", async () => {
    const { metadata } = await import("./page");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("Permissions-Policy", () => {
  async function policyFor(path: string): Promise<string | undefined> {
    const rules = (await nextConfig.headers?.()) ?? [];
    const matching = rules.filter((rule) => rule.source === "/:path*" || rule.source === path);
    return matching
      .flatMap((rule) => rule.headers)
      .findLast((header) => header.key === "Permissions-Policy")?.value;
  }

  it("lets Paddle's checkout frame ask for wallets on /checkout only", async () => {
    const checkout = await policyFor("/checkout");
    expect(checkout).toContain(
      'payment=(self "https://buy.paddle.com" "https://sandbox-buy.paddle.com")',
    );
    expect(checkout).toContain("camera=(), microphone=(self), geolocation=()");
    expect(await policyFor("/pricing")).toBe(
      "camera=(), microphone=(self), geolocation=(), payment=()",
    );
  });
});
