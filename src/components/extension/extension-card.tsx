"use client";

import { Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/client";
import type { ExtensionConnection } from "@/lib/extension/types";

const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function connectionLine({ connectedAt, browsers }: ExtensionConnection): string {
  const where = browsers > 1 ? ` in ${browsers} browsers` : "";
  return `Connected${where} since ${day.format(connectedAt)}. It checks job posts against your resume on the page, and saves them to your board.`;
}

// Shown only once the extension is connected, so accounts without it see no change.
export function ExtensionCard() {
  const [connection, setConnection] = useState<ExtensionConnection | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let live = true;
    api.extensionConnection().then(
      (res) => {
        if (live) setConnection(res.connection);
      },
      () => {},
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
      toast({ title: "Otto for Chrome is disconnected", description: "Every browser it was in." });
    } catch (error) {
      toast({
        title: "Couldn't disconnect it",
        description: errorMessage(error),
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  if (!connection) return null;
  return (
    <Card id="chrome-extension" role="region" aria-labelledby="chrome-extension-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardHeader>
          <CardTitle as="h2" id="chrome-extension-title">
            Chrome extension
          </CardTitle>
          <CardDescription className="max-w-prose">{connectionLine(connection)}</CardDescription>
        </CardHeader>
        <Button
          variant="secondary"
          onClick={() => void disconnect()}
          loading={pending}
          className="w-full shrink-0 sm:w-auto"
        >
          <Unplug />
          Disconnect
        </Button>
      </div>
    </Card>
  );
}
