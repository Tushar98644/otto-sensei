"use client";

import { islandsOnDemand } from "../on-demand";
import type * as Islands from "./islands";

export const loader = islandsOnDemand<typeof Islands>(() => import("./islands"));
export const ExtraSection = loader.part("ExtraSection");
export const Intro = loader.part("Intro");
export const Navbar = loader.part("Navbar");
export const Profile = loader.part("Profile");
export const ProjectSummary = loader.part("ProjectSummary");
export const ReelRoot = loader.part("ReelRoot");
export const RevealFrame = loader.part("RevealFrame");
