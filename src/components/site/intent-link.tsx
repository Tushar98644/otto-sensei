"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

export type IntentLinkProps = Omit<ComponentProps<typeof Link>, "prefetch">;

// Prefetches on hover, touch or focus only: a link in view no longer downloads the route for everyone.
export function IntentLink({ onMouseEnter, onTouchStart, onFocus, ...props }: IntentLinkProps) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={(event) => {
        setIntent(true);
        onMouseEnter?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
    />
  );
}
