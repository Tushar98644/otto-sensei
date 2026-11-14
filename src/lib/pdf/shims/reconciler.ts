import { version } from "react";
// @ts-expect-error The per-React reconciler builds ship without types.
import createRenderer from "@react-pdf/reconciler/lib/reconciler-33.js";

// Stands in for the package index, which bundles reconcilers for React 18 and 19.0 that never run here.
const [major = 0, minor = 0] = version.split(".").map(Number);
if (major < 19 || (major === 19 && minor < 2)) {
  throw new Error(`The PDF renderer shim needs React 19.2 or later, not ${version}.`);
}

export default createRenderer;
