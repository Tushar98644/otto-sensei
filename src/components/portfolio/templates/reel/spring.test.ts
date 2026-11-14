import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { afterFrame, animate, cubicBezier, spring, SpringValue, tweenAt } from "./spring";

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
    expect(t).toBeGreaterThan(1000);
    expect(t).toBeLessThan(6000);
  });

  it("overshoots when underdamped and never when overdamped", () => {
    const under = settle(spring(0, 10, { stiffness: 100, damping: 10 })).values;
    expect(Math.max(...under)).toBeGreaterThan(11);
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

describe("frame loop", () => {
  let queue: FrameRequestCallback[] = [];
  let now = 0;
  const frame = () => {
    now += 1000 / 60;
    const callbacks = queue;
    queue = [];
    for (const callback of callbacks) callback(now);
    return callbacks.length;
  };
  const settle = () => {
    for (let frames = 0; queue.length > 0 && frames < 5000; frames += 1) frame();
  };

  beforeEach(() => {
    queue = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      queue.push(callback),
    );
  });
  afterEach(() => {
    settle();
    vi.unstubAllGlobals();
  });

  it("steps both tilt springs in one frame callback and draws once a frame", () => {
    const config = { stiffness: 40, damping: 20, mass: 1.4, restSpeed: 0.001 };
    const tiltX = new SpringValue(0, config);
    const tiltY = new SpringValue(0, config);
    const draw = vi.fn();
    const invalidate = () => afterFrame(draw);
    tiltX.on(invalidate);
    tiltY.on(invalidate);
    tiltX.set(0.25);
    tiltY.set(-0.25);
    expect(queue).toHaveLength(1);
    let frames = 0;
    while (queue.length > 0 && frames < 5000) {
      const drawn = draw.mock.calls.length;
      expect(frame()).toBe(1);
      expect(draw.mock.calls.length - drawn).toBeLessThanOrEqual(1);
      frames += 1;
    }
    expect(draw.mock.calls.length).toBeGreaterThan(30);
    expect(tiltX.get()).toBe(0.25);
    expect(tiltY.get()).toBe(-0.25);
  });

  it("draws once for a redraw asked for outside a frame", () => {
    const draw = vi.fn();
    afterFrame(draw);
    afterFrame(draw);
    expect(queue).toHaveLength(1);
    frame();
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it("never updates an animation stopped before its first frame", () => {
    const onUpdate = vi.fn();
    animate(0, 1, { onUpdate }).stop();
    settle();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("keeps the other animations going when one of them throws", () => {
    const reportError = vi.fn();
    vi.stubGlobal("reportError", reportError);
    const onUpdate = vi.fn();
    animate(0, 1, {
      onUpdate: () => {
        throw new Error("broken");
      },
    });
    animate(0, 1, { onUpdate });
    settle();
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenLastCalledWith(1);
  });
});
