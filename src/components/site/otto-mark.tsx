import { OTTO_COLORS as C } from "@/components/mascot/palette";
import { cn } from "@/lib/utils";

export type OttoMarkProps = {
  tone?: "color" | "line";
  small?: boolean;
  className?: string;
};

export function OttoMark({ tone = "color", small = false, className }: OttoMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={cn("size-8 shrink-0", className)}
    >
      {tone === "line" ? <LineHead small={small} /> : <ColorHead />}
    </svg>
  );
}

function ColorHead() {
  return (
    <>
      <g stroke={C.line} strokeWidth={3} strokeLinejoin="round">
        <circle cx={6.5} cy={28.5} r={5} fill={C.fur} />
        <circle cx={57.5} cy={28.5} r={5} fill={C.fur} />
      </g>
      <circle cx={5.8} cy={28} r={2.3} fill={C.furShade} />
      <circle cx={58.2} cy={28} r={2.3} fill={C.furShade} />
      <ellipse cx={32} cy={38} rx={28.5} ry={20.5} fill={C.fur} stroke={C.line} strokeWidth={3} />
      <path
        d="M32 42.5C35.5 39.5 45 39.8 46.3 46C47.5 52 40.5 55 35.5 53.6C34.2 53.2 33 52.8 32 52.8C31 52.8 29.8 53.2 28.5 53.6C23.5 55 16.5 52 17.7 46C19 39.8 28.5 39.5 32 42.5Z"
        fill={C.cream}
      />
      <circle cx={20.5} cy={33.5} r={3.6} fill={C.eye} />
      <circle cx={43.5} cy={33.5} r={3.6} fill={C.eye} />
      <circle cx={21.8} cy={32.2} r={1.2} fill={C.shine} />
      <circle cx={44.8} cy={32.2} r={1.2} fill={C.shine} />
      <g fill="none" stroke={C.line} strokeWidth={3}>
        <circle cx={20.5} cy={33} r={8.5} />
        <circle cx={43.5} cy={33} r={8.5} />
      </g>
      <path
        d="M29 32Q32 29.8 35 32"
        fill="none"
        stroke={C.line}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <path
        d="M27 43C27 40.2 37 40.2 37 43C37 45.6 33.6 47.4 32 47.4C30.4 47.4 27 45.6 27 43Z"
        fill={C.nose}
      />
      <path
        d="M32 47.2V49.2M28.6 49.4C29.8 51.6 31.2 51.6 32 49.6C32.8 51.6 34.2 51.6 35.4 49.4"
        fill="none"
        stroke={C.line}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </>
  );
}

function LineHead({ small }: { small: boolean }) {
  return (
    <>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={small ? 3.5 : 2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15.5 22.8C20.5 20.2 26 19 32.5 19C47.5 19 59.5 26 59.5 38C59.5 50 47.5 57 32 57C16.5 57 4.5 50 4.5 38.5C4.5 35.5 5.2 33 6.5 31" />
        <path d="M4.6 28C2.6 25.2 3.8 21 7.6 20.5C10 20.2 11.8 21 12.8 22.3" />
        <path d="M51.5 22.4C52.6 20.6 54.8 19.7 57 20.3C60.4 21.2 61.6 24.9 60.6 27.8" />
        <circle cx={21} cy={34} r={7} />
        <circle cx={43} cy={34} r={7} />
        <path d="M28 33.5Q32 31.5 36 33.5" />
        <path d="M32 45C28 41.5 19 42 18.5 47.5C18 52.5 25.5 54 32 50.5C38.5 54 46 52.5 45.5 47.5C45 42 36 41.5 32 45" />
      </g>
      <path
        d="M18.5 46.5L9.5 45M19 50L10.5 52.5M45.5 46.5L54.5 45M45 50L53.5 52.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.7}
      />
      <g fill="currentColor">
        <circle cx={21} cy={34.8} r={2.1} />
        <circle cx={43} cy={34.8} r={2.1} />
        <path d="M28.5 44C28.5 41.6 35.5 41.6 35.5 44C35.5 46 33.2 47.3 32 47.3C30.8 47.3 28.5 46 28.5 44Z" />
      </g>
    </>
  );
}
