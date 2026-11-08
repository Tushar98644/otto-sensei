// Client-safe types for the hiring-system notes: what each applicant tracking system is documented
// to do with an application, and the form questions a job post exposes.

export type HiringSystemId =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "icims"
  | "taleo"
  | "successfactors"
  | "smartrecruiters"
  | "workable"
  | "bamboohr"
  | "jobvite"
  | "recruitee"
  | "teamtailor";

// file: how it reads the file. search: how recruiters find you. screening: rules that reject on
// their own. ai: the vendor's AI review. review: how people work through the list.
export type NoteTopic = "file" | "search" | "screening" | "ai" | "review";

// One documented fact, never a score or a prediction: each note links to the page that says it.
export type HiringNote = {
  topic: NoteTopic;
  fact: string;
  // What the person can do about it.
  todo: string;
  source: { label: string; url: string };
  // The feature exists only where the employer turns it on.
  optIn?: boolean;
};

export type HiringSystem = {
  id: HiringSystemId;
  name: string;
  notes: readonly HiringNote[];
};

// A yes/no or pick-from-a-list question on a job's application form: the kinds Greenhouse lets an
// employer reject on automatically. Whether this employer does is never known.
export type ScreeningQuestion = {
  label: string;
  required: boolean;
  kind: "yes_no" | "single" | "multi";
  // The first few choices, as the form words them.
  options: string[];
  // All of them, for "Pick from 195 choices".
  optionCount: number;
};
