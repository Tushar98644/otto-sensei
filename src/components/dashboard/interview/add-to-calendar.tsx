"use client";

import { CalendarPlus } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
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
  function add() {
    try {
      downloadInterviewCalendar(interview);
      toast({
        title: "Calendar file ready",
        description:
          "Open it to add the interview day, with a reminder to practise the morning before.",
      });
    } catch {
      toast({
        title: "Couldn't make the calendar file",
        description: "Try again in a moment.",
        variant: "error",
      });
    }
  }
  return (
    <Button variant={variant} size={size} onClick={add} className={className}>
      <CalendarPlus aria-hidden />
      Add to calendar
    </Button>
  );
}
