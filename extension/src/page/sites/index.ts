import type { JobSite } from "@/lib/extension/urls";
import type { SiteReader } from "../post";
import { ashby } from "./ashby";
import { greenhouse } from "./greenhouse";
import { indeed } from "./indeed";
import { lever } from "./lever";
import { linkedin } from "./linkedin";
import { naukri } from "./naukri";
import { smartrecruiters } from "./smartrecruiters";
import { workable } from "./workable";
import { workday } from "./workday";

export const SITE_READERS: Record<Exclude<JobSite, "other">, SiteReader> = {
  linkedin,
  naukri,
  indeed,
  greenhouse,
  lever,
  ashby,
  workday,
  smartrecruiters,
  workable,
};
