import { resumeToText } from "@/lib/resume/ops";
import { createSampleResume } from "@/lib/resume/sample";

// Written for the sample resume: some skills in a line, some only listed, some missing.
export const SAMPLE_POST = `Senior Product Marketing Manager
Fernway · Remote (US)

Fernway makes scheduling software for clinics. We're hiring a product marketer to own our launches and tell our story to mid-size teams.

What you'll do
- Own positioning and messaging for two product lines
- Plan and run launches with product and sales
- Build sales enablement: decks, battlecards and demo scripts
- Run customer interviews and win-loss research
- Report on launch results in Google Analytics

Requirements
- 5+ years of product marketing in B2B SaaS
- Go-to-market strategy for new products
- Hands-on with HubSpot and Salesforce
- Pulls your own numbers with SQL
- Strong copywriting

Nice to have
- Social media and email marketing
- Marketo
- A/B testing on pricing pages
- Figma for quick mockups
- Fluent Spanish`;

export type SampleTexts = { resume: string; job: string };

export function sampleTexts(): SampleTexts {
  return { resume: resumeToText(createSampleResume()), job: SAMPLE_POST };
}
