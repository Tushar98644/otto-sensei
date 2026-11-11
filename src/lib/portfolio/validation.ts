import { z } from "zod";
import { ResumeSchema } from "@/lib/resume/validation";
import { PORTFOLIO_SECTIONS, PORTFOLIO_TEMPLATE_IDS } from "./types";

// Request schemas for the portfolio routes (zod), apart from ./types so the dashboard and the sales
// pages don't load zod.

export const PortfolioTemplateIdSchema = z.enum(PORTFOLIO_TEMPLATE_IDS);

export const PortfolioSectionSchema = z.enum(PORTFOLIO_SECTIONS);

// The address is checked against the slug rules (./slug.ts) by the route, so the person gets a
// reason instead of a generic "bad request".
const slugInput = z.string().trim().max(80);

// POST /api/portfolio: makes the account's portfolio from this resume, or points it at this
// resume when it already has one. The address is suggested from the name when none is given.
export const CreatePortfolioSchema = z.object({
  resume: ResumeSchema,
  slug: slugInput.optional(),
  template: PortfolioTemplateIdSchema.optional(),
});

// PATCH /api/portfolio: any of these, at least one. `resume` refreshes the page's copy (or
// switches it to another resume).
export const UpdatePortfolioSchema = z
  .object({
    resume: ResumeSchema.optional(),
    slug: slugInput.optional(),
    template: PortfolioTemplateIdSchema.optional(),
    showEmail: z.boolean().optional(),
    showPhone: z.boolean().optional(),
    hiddenSections: z
      .array(PortfolioSectionSchema)
      .max(PORTFOLIO_SECTIONS.length)
      .transform((keys) => [...new Set(keys)])
      .optional(),
    sync: z.boolean().optional(),
    published: z.boolean().optional(),
    allowIndexing: z.boolean().optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: "Nothing to change.",
  });

// POST /api/portfolio/views: one visit to a published page, sent by the page itself.
export const PortfolioViewSchema = z.object({ slug: z.string().trim().max(80) });
