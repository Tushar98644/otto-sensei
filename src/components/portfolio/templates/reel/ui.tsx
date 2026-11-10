import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { Icon, type ReelIcon } from "./sprites";

// HamishMW/portfolio's small components (button, divider, loader, text, heading), as plain
// markup with the same data attributes his CSS keys off. No hooks: used by the server template
// and the client islands alike.

const EXTERNAL = /^https?:/i;

type DataAttributes = { [key: `data-${string}`]: string | boolean | undefined };

/** components/button: a link when it has an href, else a button. */
export function Button({
  href,
  secondary,
  icon,
  iconEnd,
  iconHoverShift,
  iconOnly,
  className,
  children,
  label,
  expanded,
  onClick,
  ...rest
}: {
  href?: string;
  secondary?: boolean;
  icon?: ReelIcon;
  iconEnd?: ReelIcon;
  iconHoverShift?: boolean;
  iconOnly?: boolean;
  className?: string;
  children?: ReactNode;
  label?: string;
  expanded?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
} & DataAttributes) {
  const classes = ["button", className].filter(Boolean).join(" ");
  const content = (
    <>
      {icon ? (
        <Icon
          icon={icon}
          className="button-icon"
          data-start={!iconOnly}
          data-shift={iconHoverShift}
        />
      ) : null}
      {children ? <span className="button-text">{children}</span> : null}
      {iconEnd ? (
        <Icon
          icon={iconEnd}
          className="button-icon"
          data-end={!iconOnly}
          data-shift={iconHoverShift}
        />
      ) : null}
    </>
  );
  const attributes = {
    className: classes,
    "data-icon-only": iconOnly,
    "data-secondary": secondary,
    "data-icon": icon,
    "aria-label": label,
    onClick,
    ...rest,
  };
  if (!href) {
    return (
      <button type="button" aria-expanded={expanded} {...attributes}>
        {content}
      </button>
    );
  }
  // Links on someone's page lead away from it: no referrer, no ranking credit.
  const external = EXTERNAL.test(href);
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer nofollow ugc" : undefined}
      {...attributes}
    >
      {content}
    </a>
  );
}

/** components/divider: a line with a notch hanging under its start, collapsing until shown. */
export function Divider({
  notchWidth = "90px",
  notchHeight = "10px",
  collapsed = false,
  collapseDelay = 0,
}: {
  notchWidth?: string;
  notchHeight?: string;
  collapsed?: boolean;
  collapseDelay?: number;
}) {
  return (
    <div
      className="divider"
      style={
        {
          "--notchWidth": notchWidth,
          "--notchHeight": notchHeight,
          "--collapseDelay": `${collapseDelay}ms`,
        } as CSSProperties
      }
    >
      <div className="divider-line" data-collapsed={collapsed} />
      <div
        className="divider-notch"
        data-collapsed={collapsed}
        style={{ "--collapseDelay": `${collapseDelay + 160}ms` } as CSSProperties}
      />
    </div>
  );
}

/** components/loader: a sliding bar, or the word when motion is reduced. */
export function Loader({
  className,
  center,
  reduceMotion,
  ...rest
}: { className?: string; center?: boolean; reduceMotion: boolean } & DataAttributes) {
  if (reduceMotion) {
    return (
      <span className={["text loader-text", className].filter(Boolean).join(" ")} {...rest}>
        Loading...
      </span>
    );
  }
  return (
    <div className={["loader", className].filter(Boolean).join(" ")} data-center={center} {...rest}>
      <div className="loader-span" />
    </div>
  );
}
