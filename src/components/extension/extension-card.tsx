"use client";

import { Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { Button, buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import { api } from "@/lib/api/client";
import { CHROME_STORE_URL } from "@/lib/extension/store";
import type { ExtensionConnection } from "@/lib/extension/types";

type ExtensionWords = Messages["account"]["extension"];

const DAY = { month: "short", day: "numeric", year: "numeric" } as const;

export function connectionLine(
  words: ExtensionWords,
  format: Format,
  { connectedAt, browsers }: ExtensionConnection,
): string {
  const date = format.date(connectedAt, DAY);
  return browsers > 1
    ? fmt(words.connectedIn, { count: browsers, date })
    : fmt(words.connected, { date });
}

export function ExtensionCard() {
  const words = useMessages("account").extension;
  const format = useFormat();
  const [connection, setConnection] = useState<ExtensionConnection | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let live = true;
    api.extensionConnection().then(
      (res) => {
        if (!live) return;
        setConnection(res.connection);
        setLoaded(true);
      },
      () => {
        if (live) setLoaded(true);
      },
    );
    return () => {
      live = false;
    };
  }, []);

  async function disconnect() {
    setPending(true);
    try {
      await api.disconnectExtension();
      setConnection(null);
      toast({ title: words.disconnected, description: words.everyBrowser });
    } catch (error) {
      toast({
        title: words.disconnectFailed,
        description: errorMessage(error),
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  if (!loaded) return null;
  if (!connection) return <ExtensionOffer />;
  return (
    <Card id="chrome-extension" role="region" aria-labelledby="chrome-extension-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardHeader>
          <CardTitle as="h2" id="chrome-extension-title">
            {words.title}
          </CardTitle>
          <CardDescription className="max-w-prose">
            {connectionLine(words, format, connection)}
          </CardDescription>
        </CardHeader>
        <Button
          variant="secondary"
          onClick={() => void disconnect()}
          loading={pending}
          className="w-full shrink-0 sm:w-auto"
        >
          <Unplug />
          {words.disconnect}
        </Button>
      </div>
    </Card>
  );
}

function ExtensionOffer() {
  const words = useMessages("account").extension;
  return (
    <Card id="chrome-extension" role="region" aria-labelledby="chrome-extension-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardHeader>
          <CardTitle as="h2" id="chrome-extension-title" className="flex items-center gap-2">
            {words.title}
            {CHROME_STORE_URL ? null : <Badge>{words.soon}</Badge>}
          </CardTitle>
          <CardDescription className="max-w-prose">
            {words.pitch}
            {CHROME_STORE_URL ? null : ` ${words.soonStore}`}
          </CardDescription>
        </CardHeader>
        {CHROME_STORE_URL ? (
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses({
              variant: "secondary",
              className: "w-full shrink-0 sm:w-auto",
            })}
          >
            {words.add}
          </a>
        ) : null}
      </div>
    </Card>
  );
}
