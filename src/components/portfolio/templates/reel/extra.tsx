"use client";

import { useRef, useState, type ReactNode } from "react";
import { useSectionVisible } from "./motion";
import { Divider } from "./ui";

export function ExtraSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const sectionVisible = useSectionVisible(sectionRef);
  const [focused, setFocused] = useState(false);
  const visible = sectionVisible || focused;
  const titleId = `${id}-title`;
  return (
    <section
      className="extra section"
      id={id}
      ref={sectionRef}
      data-visible={visible}
      aria-labelledby={titleId}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      tabIndex={-1}
    >
      <div className="extra-content">
        <div className="extra-tag">
          <Divider notchWidth="64px" notchHeight="8px" collapsed={!visible} collapseDelay={1000} />
          <h2 className="profile-tag-text" data-visible={visible} id={titleId}>
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}
