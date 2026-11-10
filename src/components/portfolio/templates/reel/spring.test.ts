import { describe, expect, it } from "vitest";
import { cubicBezier, spring, tweenAt } from "./spring";

// The springs Hamish's portfolio gets from framer-motion, checked against the physics: they start
// where they're told, overshoot only when underdamped, and come to rest on the target.

function settle(solver: ReturnType<typeof spring>, step = 1000 / 60, limit = 20_000) {
  const values: number[] = [];
  for (let t = 0; t <= limit; t += step) {
    const { value, done } = solver.at(t);
    values.push(value);
    if (done) return { values, t };
  }
  return { values, t: Infinity };
}

describe("spring", () => {
  it("starts at the origin and rests exactly on the target", () => {
    const solver = spring(0, 12, { stiffness: 8, damping: 5 });
    expect(solver.at(0).value).toBeCloseTo(0, 6);
    const { values, t } = settle(solver);
    expect(values.at(-1)).toBe(12);
    // The decoder text's spring takes a second or two, as on the original site.
    expect(t).toBeGreaterThan(1000);
    expect(t).toBeLessThan(6000);
  });

  it("overshoots when underdamped and never when overdamped", () => {
    // framer-motion's default spring (stiffness 100, damping 10): damping ratio 0.5.
    const under = settle(spring(0, 10, { stiffness: 100, damping: 10 })).values;
    expect(Math.max(...under)).toBeGreaterThan(11);
    // The model's lid: stiffness 80, damping 20 (ratio 1.12) never passes closed.
    const over = settle(
      spring(Math.PI / 2, 0, { stiffness: 80, damping: 20, restDelta: 0.0001, restSpeed: 0.0001 }),
    ).values;
    expect(Math.min(...over)).toBeGreaterThanOrEqual(0);
    expect(over.at(-1)).toBe(0);
  });

  it("carries an initial velocity, as a pointer-driven spring does", () => {
    const still = spring(0, 0.5, { stiffness: 30, damping: 20, mass: 2 });
    const moving = spring(0, 0.5, { stiffness: 30, damping: 20, mass: 2, velocity: 2 });
    expect(moving.at(50).value).toBeGreaterThan(still.at(50).value);
  });

  it("handles a critically damped spring", () => {
    // damping = 2 * sqrt(stiffness * mass)
    const solver = spring(0, 1, { stiffness: 100, damping: 20, mass: 1 });
    const { values } = settle(solver);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
    expect(values.at(-1)).toBe(1);
  });
});

describe("tween", () => {
  it("eases from start to end over 300ms, like framer-motion's default", () => {
    expect(tweenAt(1, 0, 0)).toEqual({ value: 1, done: false });
    expect(tweenAt(1, 0, 150).value).toBeLessThan(0.5);
    expect(tweenAt(1, 0, 300)).toEqual({ value: 0, done: true });
    const ease = cubicBezier(0.4, 0, 0.2, 1);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.774, 2);
  });
});
