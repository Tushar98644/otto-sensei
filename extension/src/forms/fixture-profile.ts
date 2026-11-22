import { emptyAnswers } from "@/lib/extension/answers";
import type { FillProfile } from "@/lib/extension/types";
import { readFileSync } from "node:fs";
import { pageFromHtml } from "../testing/mini-dom";
import { formPlatformOf, formRoot } from "./platforms";
import { scanQuestions } from "./scan";

// Tests only: one person's fill data and the saved forms.

export function profile(overrides: Partial<FillProfile> = {}): FillProfile {
  const answers = {
    ...emptyAnswers(),
    noticePeriod: "30 days",
    workRights: {
      US: { authorized: true, sponsorship: false },
      IN: { authorized: true, sponsorship: false },
    },
  };
  return {
    resume: {
      id: "resume-1",
      title: "Data analyst",
      tailored: false,
      fileName: "Ana-Souza-Resume.pdf",
    },
    contact: {
      firstName: "Ana",
      lastName: "Souza",
      fullName: "Ana Souza",
      email: "ana@example.com",
      phone: "+1 415 555 0100",
      location: "San Francisco, CA",
      city: "San Francisco",
      country: "US",
      linkedin: "https://www.linkedin.com/in/anasouza",
      github: "https://github.com/anasouza",
      portfolio: "https://anasouza.dev",
      website: "https://anasouza.dev",
      twitter: "",
    },
    current: { company: "Feedzai", title: "Data Analyst" },
    work: [
      {
        company: "Feedzai",
        title: "Data Analyst",
        location: "Lisbon",
        start: { month: 3, year: 2022 },
        end: null,
        current: true,
        description: "- Built fraud dashboards used by 30 banks.",
      },
    ],
    education: [
      {
        school: "University of Lisbon",
        degree: "Bachelor of Science",
        field: "Statistics",
        start: { month: null, year: 2016 },
        end: { month: null, year: 2020 },
      },
    ],
    answers,
    saved: answers,
    ...overrides,
  };
}

export function formOf(file: string, url: string) {
  const page = pageFromHtml(
    readFileSync(new URL(`../../fixtures/forms/${file}`, import.meta.url), "utf8"),
    url,
  );
  const platform = formPlatformOf(url);
  if (!platform) throw new Error(`no form platform for ${url}`);
  const form = formRoot(platform, page.root);
  return { page, platform, form, questions: form ? scanQuestions(platform, page.root, form) : [] };
}
