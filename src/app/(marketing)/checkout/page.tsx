import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROUTES } from "@/components/site/routes";
import { CheckoutClient } from "./_components/checkout-client";
import {
  checkoutTarget,
  paddleClientToken,
  type CheckoutSearchParams,
} from "./_components/checkout-target";

// Paddle's default payment link: its emails open this page signed out, so it never asks for a session.
export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<CheckoutSearchParams> };

export default async function CheckoutPage({ searchParams }: Props) {
  const target = checkoutTarget(await searchParams);
  if (!target) redirect(ROUTES.pricing);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-16 sm:py-24">
      <h1 className="font-display text-5xl/none font-normal tracking-tight text-ink">Checkout</h1>
      <CheckoutClient
        token={paddleClientToken(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN)}
        target={target}
      />
    </div>
  );
}
