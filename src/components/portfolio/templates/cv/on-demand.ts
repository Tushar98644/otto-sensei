"use client";

import { islandsOnDemand } from "../on-demand";
import type * as Islands from "./islands";

export const loader = islandsOnDemand<typeof Islands>(() => import("./islands"));
export const Greeting = loader.part("Greeting");
export const IsoMark = loader.part("IsoMark");
export const LocalTime = loader.part("LocalTime");
export const Logotype = loader.part("Logotype");
export const ShowMore = loader.part("ShowMore");
export const Taglines = loader.part("Taglines");
export const ThemeToggle = loader.part("ThemeToggle");
