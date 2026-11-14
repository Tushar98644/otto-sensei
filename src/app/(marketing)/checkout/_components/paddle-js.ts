import { checkoutExit, isSandboxToken, type CheckoutTarget } from "./checkout-target";

export type PaddleEvent = { name?: string };

type PaddleCheckoutSettings = {
  displayMode: "overlay";
  variant: "one-page";
  theme: "light";
  allowLogout: boolean;
};

export type PaddleJs = {
  Environment: { set: (environment: "sandbox") => void };
  Initialize: (options: { token: string; eventCallback: (event: PaddleEvent) => void }) => void;
  Checkout: {
    open: (options: { transactionId: string; settings: PaddleCheckoutSettings }) => void;
  };
};

// allowLogout false keeps the email on the transaction's customer, which the webhook matches on.
const CHECKOUT_SETTINGS: PaddleCheckoutSettings = {
  displayMode: "overlay",
  variant: "one-page",
  theme: "light",
  allowLogout: false,
};

export function openPaddleCheckout(
  paddle: PaddleJs,
  token: string,
  target: CheckoutTarget,
  handlers: { loaded: () => void; leave: (path: string) => void },
): void {
  let completed = false;
  if (isSandboxToken(token)) paddle.Environment.set("sandbox");
  paddle.Initialize({
    token,
    eventCallback: ({ name }) => {
      if (name === "checkout.loaded") handlers.loaded();
      const exit = checkoutExit(name, completed, target);
      if (name === "checkout.completed") completed = true;
      if (exit !== null) handlers.leave(exit);
    },
  });
  paddle.Checkout.open({ transactionId: target.transactionId, settings: CHECKOUT_SETTINGS });
}
