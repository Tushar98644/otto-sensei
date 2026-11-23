"use client";

import { designRuntime } from "../on-demand";
import { designFonts } from "./fonts";
import * as islands from "./islands";
import { loader } from "./on-demand";

loader.keep(islands);

export default designRuntime(designFonts);
