"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMessages } from "@/i18n/client";
import { useWritingStyle } from "./use-writing-style";
import { WritingStyleForm } from "./writing-style-form";

export function WritingStyleCard() {
  const account = useMessages("account");
  const { status, style, save, retry } = useWritingStyle();
  return (
    <Card>
      {status === "error" ? (
        <Alert
          variant="error"
          title={account.style.loadFailed}
          action={
            <Button variant="secondary" onClick={retry}>
              {account.tryAgain}
            </Button>
          }
        >
          {account.checkConnection}
        </Alert>
      ) : (
        // The form waits disabled at its full height, so links to the cards below it land in place.
        <WritingStyleForm key={style ? "ready" : "loading"} saved={style} onSave={save} />
      )}
    </Card>
  );
}
