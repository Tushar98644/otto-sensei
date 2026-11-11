import { z } from "zod";
import { ResumeSchema } from "@/lib/resume/validation";

export const CreateShareSchema = z.object({
  resume: ResumeSchema,
  showContact: z.boolean().default(false),
  allowIndexing: z.boolean().default(false),
});

export const UpdateShareSchema = z
  .object({ showContact: z.boolean().optional(), allowIndexing: z.boolean().optional() })
  .refine((body) => body.showContact !== undefined || body.allowIndexing !== undefined, {
    message: "Nothing to change.",
  });
