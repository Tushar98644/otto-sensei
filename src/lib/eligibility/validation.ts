import { z } from "zod";
import { isCountryCode } from "./places";
import { WORK_RIGHTS, isTimeZone } from "./profile";

const RightSchema = z.enum(WORK_RIGHTS).nullable();

export const WorkProfileSchema = z
  .object({
    country: z
      .string()
      .max(2)
      .refine((code) => code === "" || isCountryCode(code), "Pick a country from the list."),
    timeZone: z
      .string()
      .max(64)
      .refine((zone) => zone === "" || isTimeZone(zone), "Pick a time zone from the list."),
    rights: z.object({ us: RightSchema, uk: RightSchema, eu: RightSchema, ca: RightSchema }),
    fullTime: z.boolean(),
    contract: z.boolean(),
    remoteOnly: z.boolean().optional(),
  })
  .refine((profile) => profile.fullTime || profile.contract, {
    message: "Pick full-time, contract or both.",
    path: ["fullTime"],
  });
