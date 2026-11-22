import { z } from "zod";
import { EXTENSION_LIMITS } from "./types";
import { JOB_SITES } from "./urls";

export const SavePostSchema = z.object({
  url: z.string().trim().min(1).max(EXTENSION_LIMITS.urlChars),
  site: z.enum(JOB_SITES).catch("other"),
  title: z
    .string()
    .max(EXTENSION_LIMITS.titleChars * 2)
    .default(""),
  company: z
    .string()
    .max(EXTENSION_LIMITS.companyChars * 2)
    .default(""),
  location: z
    .string()
    .max(EXTENSION_LIMITS.locationChars * 2)
    .default(""),
  // Longer posts are cut to the limit rather than refused: the start of a post says the most.
  text: z
    .string()
    .max(EXTENSION_LIMITS.postChars * 2)
    .default(""),
});

export const PostIdSchema = z.uuid();
