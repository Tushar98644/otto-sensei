"use client";

import { islandsOnDemand } from "../on-demand";
import type * as Islands from "./islands";

export const loader = islandsOnDemand<typeof Islands>(() => import("./islands"));
export const NotesApp = loader.part("NotesApp");
