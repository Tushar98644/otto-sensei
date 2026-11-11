import { findTerm } from "./keywords";

// Keyword searches find only the form typed, so write both once: "go-to-market (GTM)". The
// matcher's own aliases (AWS, ML, UX…) already count either form as a match.

export const ACRONYMS: readonly (readonly [short: string, long: string])[] = [
  ["ACLS", "advanced cardiac life support"],
  ["API", "application programming interface"],
  ["ARR", "annual recurring revenue"],
  ["ATS", "applicant tracking system"],
  ["B2B", "business-to-business"],
  ["B2C", "business-to-consumer"],
  ["BLS", "basic life support"],
  ["CAD", "computer-aided design"],
  ["CMS", "content management system"],
  ["CPA", "certified public accountant"],
  ["CRM", "customer relationship management"],
  ["CRO", "conversion rate optimization"],
  ["CSAT", "customer satisfaction"],
  ["EHR", "electronic health record"],
  ["EMR", "electronic medical record"],
  ["ERP", "enterprise resource planning"],
  ["FP&A", "financial planning and analysis"],
  ["GAAP", "generally accepted accounting principles"],
  ["GTM", "go-to-market"],
  ["HR", "human resources"],
  ["HRIS", "human resources information system"],
  ["ICU", "intensive care unit"],
  ["KPI", "key performance indicator"],
  ["LPN", "licensed practical nurse"],
  ["MRR", "monthly recurring revenue"],
  ["NLP", "natural language processing"],
  ["NPS", "net promoter score"],
  ["OKR", "objectives and key results"],
  ["P&L", "profit and loss"],
  ["PMP", "project management professional"],
  ["PPC", "pay-per-click"],
  ["QA", "quality assurance"],
  ["RN", "registered nurse"],
  ["ROI", "return on investment"],
  ["SaaS", "software as a service"],
  ["SDR", "sales development representative"],
  ["SEM", "search engine marketing"],
  ["SEO", "search engine optimization"],
  ["SLA", "service level agreement"],
  ["SOP", "standard operating procedure"],
  ["UI", "user interface"],
];

const BY_FORM = new Map<string, readonly [string, string]>(
  ACRONYMS.flatMap((pair) => [
    [pair[0].toLowerCase(), pair],
    [pair[1].toLowerCase(), pair],
  ]),
);

export type OtherForm = {
  asked: string;
  written: string;
  both: string;
};

// Null when the term isn't in the table, the resume has the post's form, or it has neither.
export function otherForm(term: string, resumeText: string): OtherForm | null {
  const pair = BY_FORM.get(term.trim().toLowerCase());
  if (!pair) return null;
  const [short, long] = pair;
  const asked = term.trim();
  if (findTerm(resumeText, asked).found) return null;
  const written = asked.toLowerCase() === short.toLowerCase() ? long : short;
  if (!findTerm(resumeText, written).found) return null;
  return { asked, written, both: `${long} (${short})` };
}
