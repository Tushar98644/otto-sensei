"use client";

import { islandsOnDemand } from "../on-demand";
import type * as Islands from "./islands";

export const loader = islandsOnDemand<typeof Islands>(() => import("./islands"));
export const Dock = loader.part("Dock");
export const FlickeringGrid = loader.part("FlickeringGrid");
