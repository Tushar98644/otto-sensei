"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/toast";

// Goes back to the page the upgrade started on once there is something to say, and only once.
export function useUpgradeReturn(next: string | null, message: string | null): void {
  const router = useRouter();
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || !next || !message) return;
    sent.current = true;
    toast({ title: message, variant: "success" });
    router.replace(next);
  }, [next, message, router]);
}
