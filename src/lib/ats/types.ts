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

export type NoteTopic = "file" | "search" | "screening" | "ai" | "review";

export type HiringNote = {
  topic: NoteTopic;
  fact: string;
  todo: string;
  source: { label: string; url: string };
  optIn?: boolean;
};

export type HiringSystem = {
  id: HiringSystemId;
  name: string;
  notes: readonly HiringNote[];
};

export type ScreeningQuestion = {
  label: string;
  required: boolean;
  kind: "yes_no" | "single" | "multi";
  options: string[];
  optionCount: number;
};
