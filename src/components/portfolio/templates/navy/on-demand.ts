"use client";

import { islandsOnDemand } from "../on-demand";
import type * as Islands from "./islands";

export const loader = islandsOnDemand<typeof Islands>(() => import("./islands"));
export const JobTabs = loader.part("JobTabs");
export const NavMenu = loader.part("NavMenu");
export const NavScroll = loader.part("NavScroll");
export const ShowMore = loader.part("ShowMore");
