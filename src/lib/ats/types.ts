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

// One documented fact, never a score: each note links to the page that says it.
export type HiringNote = {
  topic: NoteTopic;
  fact: string;
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

// The kinds Greenhouse lets an employer reject on automatically; whether this one does is unknown.
export type ScreeningQuestion = {
  label: string;
  required: boolean;
  kind: "yes_no" | "single" | "multi";
  options: string[];
  optionCount: number;
};
