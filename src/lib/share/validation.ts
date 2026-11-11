import { z } from "zod";
import { ResumeSchema } from "@/lib/resume/validation";

// Request schemas for the share routes (zod), apart from ./types so the dashboard doesn't load zod.

// POST /api/share: makes the resume's link, or points its existing link at this version.
export const CreateShareSchema = z.object({
  resume: ResumeSchema,
  showContact: z.boolean().default(false),
  allowIndexing: z.boolean().default(false),
});

// PATCH /api/share/:id: changes who sees what, without changing the version shown.
export const UpdateShareSchema = z
  .object({ showContact: z.boolean().optional(), allowIndexing: z.boolean().optional() })
  .refine((body) => body.showContact !== undefined || body.allowIndexing !== undefined, {
    message: "Nothing to change.",
  });
