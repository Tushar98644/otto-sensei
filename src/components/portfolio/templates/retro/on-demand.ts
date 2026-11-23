"use client";

import { islandsOnDemand } from "../on-demand";
import type * as Islands from "./islands";

export const loader = islandsOnDemand<typeof Islands>(() => import("./islands"));
export const AppMenu = loader.part("AppMenu");
export const Clock = loader.part("Clock");
export const DeskProvider = loader.part("DeskProvider");
export const Dock = loader.part("Dock");
export const FocusedTitle = loader.part("FocusedTitle");
export const Launch = loader.part("Launch");
export const MenuLinks = loader.part("MenuLinks");
export const Picker = loader.part("Picker");
export const Typed = loader.part("Typed");
export const Win = loader.part("Win");
