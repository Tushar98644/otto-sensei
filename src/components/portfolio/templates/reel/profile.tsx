"use client";

import { useRef, useState, type ReactNode } from "react";
import { DecoderText } from "./decoder-text";
import { Transition, useSectionVisible } from "./motion";
import { RevealFrame } from "./reveal-frame";
import { KATAKANA_PROFILE } from "./sprites";
import { Button, Divider } from "./ui";

// Ported from HamishMW/portfolio routes/home/profile.jsx (MIT, see ./LICENSE.txt).
export function Profile({
  id,
  paragraphs,
  contact,
  initials,
  caption,
  words,
}: {
  id: string;
  paragraphs: ReactNode[];
  contact: string | null;
  initials: string;
  caption: string;
  words: { hello: string; message: string; about: string };
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const sectionVisible = useSectionVisible(sectionRef);
  const [focused, setFocused] = useState(false);
  const titleId = `${id}-title`;

  return (
    <section
      className="profile section"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      id={id}
      ref={sectionRef}
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <Transition in={sectionVisible || focused} timeout={0}>
        {({ visible }) => (
          <div className="profile-content">
            <div className="profile-column">
              <h2
                className="heading profile-title"
                data-level="3"
                data-visible={visible}
                id={titleId}
              >
                <DecoderText text={words.hello} start={visible} delay={500} />
              </h2>
              {paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="text profile-description"
                  data-size="l"
                  data-visible={visible}
                >
                  {paragraph}
                </p>
              ))}
              {contact ? (
                <Button
                  secondary
                  className="profile-button"
                  data-visible={visible}
                  href={contact}
                  icon="send"
                >
                  {words.message}
                </Button>
              ) : null}
            </div>
            <div className="profile-column">
              <div className="profile-tag" aria-hidden>
                <Divider
                  notchWidth="64px"
                  notchHeight="8px"
                  collapsed={!visible}
                  collapseDelay={1000}
                />
                <div className="profile-tag-text" data-visible={visible}>
                  {words.about}
                </div>
              </div>
              <div className="profile-image">
                <RevealFrame delay={100} className="profile-photo">
                  <div className="image-initials" aria-hidden>
                    <span className="image-initials-text">{initials}</span>
                    {caption ? <span className="image-initials-caption">{caption}</span> : null}
                  </div>
                </RevealFrame>
                <svg
                  className="profile-svg"
                  data-visible={visible}
                  viewBox="0 0 136 766"
                  aria-hidden
                >
                  <use href={`#${KATAKANA_PROFILE}`} />
                </svg>
              </div>
            </div>
          </div>
        )}
      </Transition>
    </section>
  );
}
