import { describe, expect, it } from "vitest";
import { upgradeOffer, type Offer } from "./upgrade-offer";

const BOTH: Offer = { pro: ["month", "year"], max: ["month", "year"] };

const plans = (offer: ReturnType<typeof upgradeOffer>) => offer.cards.map((card) => card.plan);

describe("upgradeOffer", () => {
  it("shows Free Pro and Max, Pro marked most popular and carrying the trial on monthly", () => {
    const offer = upgradeOffer({ current: "free", offer: BOTH, picked: "month", trial: true });
    expect(plans(offer)).toEqual(["pro", "max"]);
    expect(offer.cards[0]).toEqual({
      plan: "pro",
      current: false,
      popular: true,
      interval: "month",
      trial: true,
      endsTrial: false,
    });
    expect(offer.cards[1]).toEqual({
      plan: "max",
      current: false,
      popular: false,
      interval: "month",
      trial: false,
      endsTrial: false,
    });
    expect(offer.intervals).toEqual(["month", "year"]);
  });

  it("prices every card for the picked option; the trial is monthly only", () => {
    const offer = upgradeOffer({ current: "free", offer: BOTH, picked: "year", trial: true });
    expect(offer.interval).toBe("year");
    expect(offer.cards.map((card) => [card.plan, card.interval, card.trial])).toEqual([
      ["pro", "year", false],
      ["max", "year", false],
    ]);
    const used = upgradeOffer({ current: "free", offer: BOTH, picked: "month", trial: false });
    expect(used.cards[0]?.trial).toBe(false);
  });

  it("shows Pro its own plan as current, beside Max", () => {
    const offer = upgradeOffer({ current: "pro", offer: BOTH, picked: "year", trial: true });
    expect(plans(offer)).toEqual(["pro", "max"]);
    expect(offer.cards[0]).toMatchObject({
      current: true,
      popular: false,
      trial: false,
      interval: "year",
    });
    expect(offer.cards[1]).toMatchObject({ current: false, interval: "year" });
  });

  it("marks Max as ending the trial for someone on the Pro trial, never their own plan", () => {
    const offer = upgradeOffer({
      current: "pro",
      offer: BOTH,
      picked: "year",
      trial: false,
      onTrial: true,
    });
    expect(offer.cards.map((card) => [card.plan, card.endsTrial])).toEqual([
      ["pro", false],
      ["max", true],
    ]);
    const paying = upgradeOffer({ current: "pro", offer: BOTH, picked: "year", trial: false });
    expect(paying.cards.some((card) => card.endsTrial)).toBe(false);
  });

  it("has nothing for Max, nor for Pro while Max isn't on sale", () => {
    expect(
      upgradeOffer({ current: "max", offer: BOTH, picked: "month", trial: false }).cards,
    ).toEqual([]);
    expect(
      upgradeOffer({
        current: "pro",
        offer: { pro: ["month"], max: [] },
        picked: "month",
        trial: false,
      }).cards,
    ).toEqual([]);
  });

  it("shows Free only Pro while Max isn't on sale, with nothing to call most popular", () => {
    const offer = upgradeOffer({
      current: "free",
      offer: { pro: ["month"], max: [] },
      picked: "month",
      trial: true,
    });
    expect(plans(offer)).toEqual(["pro"]);
    expect(offer.cards[0]).toMatchObject({ popular: false, trial: true });
  });

  it("offers only billing options on sale, and monthly for a plan not sold at the pick", () => {
    const offer: Offer = { pro: ["month"], max: ["month", "year"] };
    expect(
      upgradeOffer({ current: "free", offer, picked: "month", trial: false }).intervals,
    ).toEqual(["month", "year"]);
    expect(upgradeOffer({ current: "free", offer, picked: "week", trial: false }).interval).toBe(
      "month",
    );
    const yearly = upgradeOffer({ current: "free", offer, picked: "year", trial: false });
    expect(yearly.cards.map((card) => [card.plan, card.interval])).toEqual([
      ["pro", "month"],
      ["max", "year"],
    ]);
    const all: Offer = { pro: ["month", "year", "week"], max: ["month"] };
    expect(
      upgradeOffer({ current: "pro", offer: all, picked: "week", trial: false }).intervals,
    ).toEqual(["month"]);
  });
});
