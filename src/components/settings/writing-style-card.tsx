"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWritingStyle } from "./use-writing-style";
import { WritingStyleForm } from "./writing-style-form";

export function WritingStyleCard() {
  const { status, style, save, retry } = useWritingStyle();
  return (
    <Card>
      {status === "error" ? (
        <Alert
          variant="error"
          title="Couldn't load your writing style"
          action={
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          }
        >
          Check your connection, then try again.
        </Alert>
      ) : (
        // The form waits disabled at its full height, so links to the cards below it land in place.
        <WritingStyleForm key={style ? "ready" : "loading"} saved={style} onSave={save} />
      )}
    </Card>
  );
}
