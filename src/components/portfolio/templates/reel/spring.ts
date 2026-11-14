// Ported from framer-motion 11's analytic spring and default tween (MIT).

export type SpringOptions = {
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
  restSpeed?: number;
  restDelta?: number;
};

export type Spring = {
  at: (t: number) => { value: number; done: boolean };
};

const VELOCITY_SAMPLE_MS = 5;

export function spring(from: number, to: number, options: SpringOptions = {}): Spring {
  const { stiffness = 100, damping = 10, mass = 1 } = options;
  // framer-motion works in units per millisecond with the sign flipped.
  const initialVelocity = -(options.velocity ?? 0) / 1000;
  const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
  const initialDelta = to - from;
  const undampedAngularFreq = Math.sqrt(stiffness / mass) / 1000;
  const granular = Math.abs(initialDelta) < 5;
  const restSpeed = options.restSpeed || (granular ? 0.01 : 2);
  const restDelta = options.restDelta || (granular ? 0.005 : 0.5);

  let resolve: (t: number) => number;
  if (dampingRatio < 1) {
    const angularFreq = undampedAngularFreq * Math.sqrt(1 - dampingRatio * dampingRatio);
    resolve = (t) => {
      const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t);
      return (
        to -
        envelope *
          (((initialVelocity + dampingRatio * undampedAngularFreq * initialDelta) / angularFreq) *
            Math.sin(angularFreq * t) +
            initialDelta * Math.cos(angularFreq * t))
      );
    };
  } else if (dampingRatio === 1) {
    resolve = (t) =>
      to -
      Math.exp(-undampedAngularFreq * t) *
        (initialDelta + (initialVelocity + undampedAngularFreq * initialDelta) * t);
  } else {
    const dampedAngularFreq = undampedAngularFreq * Math.sqrt(dampingRatio * dampingRatio - 1);
    resolve = (t) => {
      const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t);
      const freqForT = Math.min(dampedAngularFreq * t, 300);
      return (
        to -
        (envelope *
          ((initialVelocity + dampingRatio * undampedAngularFreq * initialDelta) *
            Math.sinh(freqForT) +
            dampedAngularFreq * initialDelta * Math.cosh(freqForT))) /
          dampedAngularFreq
      );
    };
  }

  return {
    at(t) {
      const current = resolve(t);
      let velocity = options.velocity ?? 0;
      if (t !== 0) {
        if (dampingRatio < 1) {
          const prevT = Math.max(t - VELOCITY_SAMPLE_MS, 0);
          velocity = ((current - resolve(prevT)) * 1000) / (t - prevT);
        } else {
          velocity = 0;
        }
      }
      const done = Math.abs(velocity) <= restSpeed && Math.abs(to - current) <= restDelta;
      return { value: done ? to : current, done };
    },
  };
}

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const bezier = (t: number, a: number, b: number) =>
    ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t;
  const slope = (t: number, a: number, b: number) =>
    3 * (1 - 3 * b + 3 * a) * t * t + 2 * (3 * b - 6 * a) * t + 3 * a;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const error = bezier(t, x1, x2) - x;
      if (Math.abs(error) < 1e-6) break;
      const d = slope(t, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      t -= error / d;
    }
    return bezier(Math.min(1, Math.max(0, t)), y1, y2);
  };
}

const DEFAULT_EASE = cubicBezier(0.25, 0.1, 0.35, 1);
const DEFAULT_DURATION_MS = 300;

export function tweenAt(from: number, to: number, t: number): { value: number; done: boolean } {
  const progress = Math.min(1, Math.max(0, t / DEFAULT_DURATION_MS));
  return { value: from + (to - from) * DEFAULT_EASE(progress), done: progress >= 1 };
}

export type Controls = { stop: () => void };

type FrameStep = (now: number) => void;

let frameSteps: FrameStep[] = [];
const redraws = new Set<() => void>();
let frameId = 0;

function runFrame(now: number) {
  frameId = 0;
  const steps = frameSteps;
  frameSteps = [];
  for (const step of steps) {
    try {
      step(now);
    } catch (error) {
      reportError(error);
    }
  }
  const pending = [...redraws];
  redraws.clear();
  for (const redraw of pending) {
    try {
      redraw();
    } catch (error) {
      reportError(error);
    }
  }
}

function requestFrame() {
  if (frameId === 0) frameId = requestAnimationFrame(runFrame);
}

function onNextFrame(step: FrameStep) {
  frameSteps.push(step);
  requestFrame();
}

// Runs once after this frame's animation steps, however many of them asked for it.
export function afterFrame(redraw: () => void) {
  redraws.add(redraw);
  requestFrame();
}

export function animate(
  from: number,
  to: number,
  options: SpringOptions & {
    type?: "spring";
    delay?: number;
    onUpdate: (value: number) => void;
    onComplete?: () => void;
  },
): Controls {
  const { delay = 0, onUpdate, onComplete, type, ...springOptions } = options;
  const solver = type === "spring" ? spring(from, to, springOptions) : null;
  let start: number | null = null;
  let stopped = false;
  const step = (now: number) => {
    if (stopped) return;
    start ??= now;
    const t = now - start - delay;
    if (t < 0) {
      onNextFrame(step);
      return;
    }
    const state = solver ? solver.at(t) : tweenAt(from, to, t);
    onUpdate(state.value);
    if (state.done) onComplete?.();
    else onNextFrame(step);
  };
  onNextFrame(step);
  return {
    stop() {
      stopped = true;
    },
  };
}

export class SpringValue {
  private current: number;
  private previous: number;
  private previousAt = 0;
  private updatedAt = 0;
  private listeners = new Set<(value: number) => void>();
  private animation: Controls | null = null;

  constructor(
    initial: number,
    private readonly config: SpringOptions,
  ) {
    this.current = initial;
    this.previous = initial;
  }

  get(): number {
    return this.current;
  }

  getVelocity(): number {
    const now = performance.now();
    if (now - this.updatedAt > 30 || this.updatedAt === this.previousAt) return 0;
    return ((this.current - this.previous) * 1000) / (this.updatedAt - this.previousAt);
  }

  set(target: number) {
    this.animation?.stop();
    this.animation = animate(this.current, target, {
      type: "spring",
      restDelta: 0.001,
      restSpeed: 0.01,
      ...this.config,
      velocity: this.getVelocity(),
      onUpdate: (value) => this.update(value),
    });
  }

  jump(value: number) {
    this.animation?.stop();
    this.update(value);
  }

  on(listener: (value: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy() {
    this.animation?.stop();
    this.listeners.clear();
  }

  private update(value: number) {
    this.previous = this.current;
    this.previousAt = this.updatedAt;
    this.current = value;
    this.updatedAt = performance.now();
    for (const listener of this.listeners) listener(value);
  }
}
