import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // public/ holds shipped third-party files (the Draco decoder for Reel's 3D models), not our code.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "local.db*", "public/**"]),
]);
