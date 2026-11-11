"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useReel } from "./root";
import { SpringValue } from "./spring";

// Ported from HamishMW/portfolio components/decoder-text (MIT, see ./LICENSE.txt).

// prettier-ignore
const glyphs = [
  "ア", "イ", "ウ", "エ", "オ",
  "カ", "キ", "ク", "ケ", "コ",
  "サ", "シ", "ス", "セ", "ソ",
  "タ", "チ", "ツ", "テ", "ト",
  "ナ", "ニ", "ヌ", "ネ", "ノ",
  "ハ", "ヒ", "フ", "ヘ", "ホ",
  "マ", "ミ", "ム", "メ", "モ",
  "ヤ", "ユ", "ヨ", "ー",
  "ラ", "リ", "ル", "レ", "ロ",
  "ワ", "ヰ", "ヱ", "ヲ", "ン",
  "ガ", "ギ", "グ", "ゲ", "ゴ",
  "ザ", "ジ", "ズ", "ゼ", "ゾ",
  "ダ", "ヂ", "ヅ", "デ", "ド",
  "バ", "ビ", "ブ", "ベ", "ボ",
  "パ", "ピ", "プ", "ペ", "ポ",
];

type Char = { type: "glyph" | "value"; value: string };

function shuffle(content: string[], output: Char[], position: number): Char[] {
  return content.map((value, index) => {
    if (index < position) return { type: "value", value };
    if (position % 1 < 0.5) {
      const rand = Math.floor(Math.random() * glyphs.length);
      return { type: "glyph", value: glyphs[rand]! };
    }
    return { type: "glyph", value: output[index]?.value ?? "" };
  });
}

export const DecoderText = memo(function DecoderText({
  text,
  start = true,
  delay = 0,
  className,
}: {
  text: string;
  start?: boolean;
  delay?: number;
  className?: string;
}) {
  const output = useRef<Char[]>([{ type: "glyph", value: "" }]);
  const container = useRef<HTMLSpanElement>(null);
  const { mode, reduceMotion } = useReel();
  const [decoderSpring] = useState(() => new SpringValue(0, { stiffness: 8, damping: 5 }));

  useEffect(() => {
    const node = container.current;
    if (!node || mode === "ssr") return;
    const content = Array.from(text);
    let timer = 0;

    // Built node by node: the text is the page owner's, never markup.
    const renderOutput = () => {
      node.replaceChildren(
        ...output.current.map((item) => {
          const span = document.createElement("span");
          span.className = `decoder-${item.type}`;
          span.textContent = item.value;
          return span;
        }),
      );
    };

    if (reduceMotion || mode === "still") {
      output.current = content.map((value) => ({ type: "value", value }));
      renderOutput();
      return;
    }

    const unsubscribe = decoderSpring.on((value) => {
      output.current = shuffle(content, output.current, value);
      renderOutput();
    });
    renderOutput();
    if (start) timer = window.setTimeout(() => decoderSpring.set(content.length), delay);

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [decoderSpring, mode, reduceMotion, start, delay, text]);

  useEffect(() => () => decoderSpring.destroy(), [decoderSpring]);

  return (
    <span className={["decoder", className].filter(Boolean).join(" ")}>
      <span className="visually-hidden decoder-label">{text}</span>
      <span aria-hidden className="decoder-content" ref={container} />
    </span>
  );
});
