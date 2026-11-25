"use client";

import { CircleCheck, TriangleExclamationPoint } from "lucide-react";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Resume } from "@/lib/resume/schema";
import type { SendCheckItem } from "@/lib/sendcheck";
import { countText } from "../count";
import { checkSummary, ExportCheckResult } from "./export-check-result";
import { openSendCheckTarget } from "./jump";
import type { ExportCheck } from "./use-export-check";
import { useSendCheck } from "./use-send-check";

const FIRST_SHOWN = 4;

function Item({
  item,
  resume,
  onOk,
}: {
  item: SendCheckItem;
  resume: Resume;
  onOk: (item: SendCheckItem) => void;
}) {
  const messageId = useId();
  const t = useMessages("studioDownload").send;
  return (
    <li className="flex flex-col gap-1.5 border-t border-border pt-3">
      <Badge variant="warn">
        <TriangleExclamationPoint className="text-warn" />
        {item.title}
      </Badge>
      <p id={messageId} className="text-sm/6 text-pretty text-ink">
        {item.message}
      </p>
      <p className="text-sm/5 break-words text-subtle">
        {item.place}
        {item.quote && item.rule !== "placeholder" ? (
          <>
            {" · "}
            <q className="text-muted">{item.quote}</q>
          </>
        ) : null}
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          aria-describedby={messageId}
          data-send-check-fix={item.id}
          onClick={() => openSendCheckTarget(resume, item.target)}
        >
          {t.fix}
        </Button>
        <Button variant="ghost" size="sm" aria-describedby={messageId} onClick={() => onOk(item)}>
          {t.correct}
        </Button>
      </div>
    </li>
  );
}

export type SendCheckCardProps = { resume: Resume; check: ExportCheck; pdfReady: boolean };

export function SendCheckCard({ resume, check, pdfReady }: SendCheckCardProps) {
  const { items, okCount, markOk, restore } = useSendCheck(resume);
  const [showAll, setShowAll] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pdfHeadingId = useId();
  const wordsHeadingId = useId();
  const shown = showAll ? items : items.slice(0, FIRST_SHOWN);
  const more = items.length - shown.length;
  const download = useMessages("studioDownload");
  const t = download.send;
  const format = useFormat();

  function ok(item: SendCheckItem) {
    const index = items.indexOf(item);
    const next = items[index + 1] ?? items[index - 1];
    flushSync(() => markOk(item.id));
    const target = next
      ? document.querySelector<HTMLElement>(`[data-send-check-fix="${CSS.escape(next.id)}"]`)
      : null;
    (target ?? titleRef.current)?.focus();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" ref={titleRef} tabIndex={-1} className="outline-none">
          {t.title}
        </CardTitle>
      </CardHeader>
      <section aria-labelledby={pdfHeadingId} className="flex flex-col gap-2">
        <h3 id={pdfHeadingId} className="text-sm font-medium text-ink">
          {t.software}
        </h3>
        <p aria-live="polite" className="sr-only">
          {checkSummary(download.check, format, check)}
        </p>
        <ExportCheckResult check={check} ready={pdfReady} />
      </section>
      <section
        aria-labelledby={wordsHeadingId}
        className="flex flex-col gap-3 border-t border-border pt-4"
      >
        <div className="flex flex-col gap-1">
          <h3 id={wordsHeadingId} className="text-sm font-medium text-ink">
            {t.recruiter}
          </h3>
          <p aria-live="polite" className="flex items-center gap-2 text-sm text-muted">
            {items.length === 0 ? (
              <>
                <CircleCheck className="size-4 shrink-0 text-pass" />
                {t.allClear}
              </>
            ) : (
              countText(format, t.toLook, items.length)
            )}
          </p>
        </div>
        {items.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {shown.map((item) => (
              <Item key={item.id} item={item} resume={resume} onOk={ok} />
            ))}
          </ul>
        ) : null}
        {more > 0 || okCount > 0 ? (
          <div className="flex flex-wrap gap-2">
            {more > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
                {fmt(t.showMore, { count: more })}
              </Button>
            ) : null}
            {okCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={restore} className="text-muted">
                {countText(format, t.showOk, okCount)}
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>
    </Card>
  );
}
