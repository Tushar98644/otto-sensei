import type { JobFilters, LookingForChoice } from "./types";

// What the browser sends and gets back for job alerts (alerts.ts holds the rules).
export type NewJobAlert = {
  name: string;
  filters: JobFilters;
  choice: LookingForChoice;
  resumeId?: string | null;
};

export type JobAlert = Required<NewJobAlert> & {
  id: string;
  createdAt: number;
  checkedAt: number | null;
  notedAt: number | null;
};

export type JobAlertsResponse = { ok: true; alerts: JobAlert[] };
