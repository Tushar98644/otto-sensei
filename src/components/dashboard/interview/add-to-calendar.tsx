"use client";

import { CalendarPlus } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useMessages } from "@/i18n/client";
import { downloadInterviewCalendar, type CalendarInterview } from "./calendar-file";

export function AddToCalendar({
  interview,
  variant = "secondary",
  size = "md",
  className,
}: {
  interview: CalendarInterview;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { calendar: t } = useMessages("interview");
  function add() {
    try {
      downloadInterviewCalendar(interview);
      toast({
        title: t.ready,
        description: t.readyDetail,
      });
    } catch {
      toast({
        title: t.failed,
        description: t.tryLater,
        variant: "error",
      });
    }
  }
  return (
    <Button variant={variant} size={size} onClick={add} className={className}>
      <CalendarPlus aria-hidden />
      {t.add}
    </Button>
  );
}
