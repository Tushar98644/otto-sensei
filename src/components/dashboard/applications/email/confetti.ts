// Otto's colours, read from the theme so the burst never drifts from the tokens.
const TOKENS = [
  "--color-primary",
  "--color-pass",
  "--color-otter",
  "--color-otter-light",
  "--color-lavender",
  "--color-highlight",
];
const LIFE_MS = 1_700;

// One short burst of paper bits from (x, y); the canvas removes itself when they have fallen.
export function burst(x: number, y: number, count = 90): void {
  const style = getComputedStyle(document.documentElement);
  const colors = TOKENS.map((token) => style.getPropertyValue(token).trim()).filter(Boolean);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx || colors.length === 0) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "60",
  });
  document.body.append(canvas);
  ctx.scale(ratio, ratio);
  const bits = Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.7;
    const speed = 6 + Math.random() * 8;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      turn: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 5,
      h: 3 + Math.random() * 4,
      color: colors[i % colors.length]!,
    };
  });
  const start = performance.now();
  const frame = (now: number) => {
    const t = (now - start) / LIFE_MS;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = Math.max(0, 1 - t * t);
    for (const bit of bits) {
      bit.vy += 0.3;
      bit.vx *= 0.985;
      bit.x += bit.vx;
      bit.y += bit.vy;
      bit.turn += bit.spin;
      ctx.save();
      ctx.translate(bit.x, bit.y);
      ctx.rotate(bit.turn);
      ctx.fillStyle = bit.color;
      ctx.fillRect(-bit.w / 2, -bit.h / 2, bit.w, bit.h);
      ctx.restore();
    }
    if (t < 1) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
