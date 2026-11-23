"use client";

import { islandsOnDemand } from "../on-demand";
import type * as Islands from "./islands";

export const loader = islandsOnDemand<typeof Islands>(() => import("./islands"));
export const Frame = loader.part("Frame");
export const Fx = loader.part("Fx");
export const ModeButtons = loader.part("ModeButtons");
export const Reveal = loader.part("Reveal");
