// CAD-style measurements, ported from ncdai/chanhdai.com (MIT, see ./LICENSE.txt).

function Arrow({ vertical, end }: { vertical?: boolean; end?: boolean }) {
  return vertical ? (
    <svg width="7" height="9" viewBox="0 0 7 9" className={end ? "flip-y" : undefined}>
      <path d="M3.5.5 6.5 8.5h-6Z" />
    </svg>
  ) : (
    <svg width="9" height="7" viewBox="0 0 9 7" className={end ? "flip-x" : undefined}>
      <path d="M.5 3.5 8.5.5v6Z" />
    </svg>
  );
}

export function DimensionLine({ vertical, value }: { vertical?: boolean; value?: string }) {
  return (
    <span className={vertical ? "dim-line v" : "dim-line h"}>
      <Arrow vertical={vertical} />
      <span className="dim-rule" />
      {value ? <span className="dim-value">{value}</span> : null}
      <span className="dim-rule" />
      <Arrow vertical={vertical} end />
    </span>
  );
}

// A width across the frame, between two extension lines.
export function WidthDimension({ value, className }: { value: string; className: string }) {
  return (
    <div className={className} aria-hidden>
      <span className="dim">
        <span className="ext l" />
        <span className="ext r" />
        <DimensionLine value={value} />
      </span>
    </div>
  );
}
