"use client";

import { lazyModule } from "@/components/ui/lazy";

// One loader for Home and Resumes, so whichever page loads the cards first serves the other.
export const resumeSections = lazyModule(() => import("./resume-sections"));
