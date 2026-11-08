"use client";

import { Trash } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountDialog } from "./delete-account-dialog";

export function DeleteAccountCard({ isPro }: { isPro: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Delete account</CardTitle>
        <CardDescription>Removes your account and everything saved with it.</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="w-full text-fail-ink hover:bg-fail-soft sm:w-auto"
        >
          <Trash />
          Delete account
        </Button>
      </CardFooter>
      <DeleteAccountDialog open={open} onOpenChange={setOpen} isPro={isPro} />
    </Card>
  );
}
