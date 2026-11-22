import type { ApplicationStatus } from "@/lib/applications/status";

export type AskedInterview = {
  status: ApplicationStatus;
  interviewAt: number | null;
  interviewAskedFor: number | null;
  interviewAnsweredFor: number | null;
};

// "How did it go?" stays open while the interview it asked about is still the card's, unanswered.
export function outcomeOpen(application: AskedInterview): boolean {
  const { status, interviewAt, interviewAskedFor, interviewAnsweredFor } = application;
  return (
    status === "interview" &&
    interviewAt !== null &&
    interviewAskedFor === interviewAt &&
    interviewAnsweredFor !== interviewAt
  );
}
