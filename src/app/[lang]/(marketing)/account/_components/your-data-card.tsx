"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useMessages } from "@/i18n/client";
import { downloadFile } from "./download-file";

const DATA_EXPORT_PATH = "/api/account/export";

export function YourDataCard() {
  const words = useMessages("account").data;
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    try {
      await downloadFile(DATA_EXPORT_PATH, "my-data.zip");
    } catch (error) {
      toast({
        title: words.failed,
        description: errorMessage(error),
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card id="your-data" role="region" aria-labelledby="your-data-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardHeader>
          <CardTitle as="h2" id="your-data-title">
            {words.title}
          </CardTitle>
          <CardDescription className="max-w-prose">{words.intro}</CardDescription>
        </CardHeader>
        <Button
          variant="secondary"
          onClick={() => void download()}
          loading={pending}
          className="w-full shrink-0 sm:w-auto"
        >
          <Download />
          {words.download}
        </Button>
      </div>
    </Card>
  );
}
