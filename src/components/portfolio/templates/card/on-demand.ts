"use client";

import { islandsOnDemand } from "../on-demand";
import type * as Islands from "./islands";

export const loader = islandsOnDemand<typeof Islands>(() => import("./islands"));
export const Filtered = loader.part("Filtered");
export const MoreInfo = loader.part("MoreInfo");
export const Pages = loader.part("Pages");
