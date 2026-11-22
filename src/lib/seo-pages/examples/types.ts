import type { ResumeInput } from "./build";

// A weak line Otto's line check flags, and the line that answers it.
export type ExampleLine = { weak: string; strong: string };

export type ExampleSkills = { label: string; items: readonly string[] };

export type ExampleNote = { title: string; text: string };

export type ExampleQuestion = { question: string; answer: string };

export type RoleExample = {
  slug: string;
  // Sentence case, as it reads after "Pick": "Software engineer".
  role: string;
  // The O*NET occupation Otto's job matching files this title under.
  occupation: string;
  // Other titles that land on the same occupation, for job searches.
  titles: readonly string[];
  updated: string;
  // One line for the example's card on the index pages.
  card: string;
  description: string;
  intro: string;
  // Who the made-up person is, in one line.
  person: string;
  resume: ResumeInput;
  lines: readonly ExampleLine[];
  skills: readonly ExampleSkills[];
  tips: readonly ExampleNote[];
  mistakes: readonly ExampleNote[];
  faq: readonly ExampleQuestion[];
  related: readonly string[];
};
