import { z } from "zod";
import { ResumeSchema } from "@/lib/resume/validation";
import { PORTFOLIO_SECTIONS, PORTFOLIO_TEMPLATE_IDS } from "./types";

export const PortfolioTemplateIdSchema = z.enum(PORTFOLIO_TEMPLATE_IDS);

export const PortfolioSectionSchema = z.enum(PORTFOLIO_SECTIONS);

const slugInput = z.string().trim().max(80);

export const CreatePortfolioSchema = z.object({
  resume: ResumeSchema,
  slug: slugInput.optional(),
  template: PortfolioTemplateIdSchema.optional(),
});

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

export const PortfolioViewSchema = z.object({ slug: z.string().trim().max(80) });
