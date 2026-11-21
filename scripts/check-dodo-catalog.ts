// Read-only: checks the Dodo products, webhook endpoint and keys in the env against the app. bun --env-file=.env.dodo.local scripts/check-dodo-catalog.ts
import { catalogConfig, runCatalogCheck } from "../src/lib/billing/dodo-catalog";

async function main() {
  const config = catalogConfig({ appUrl: process.env.DODO_SETUP_APP_URL });
  console.log(`Dodo Payments ${config.environment} mode catalog for ${config.appUrl}`);
  const checks = await runCatalogCheck(config);
  for (const check of checks) console.log(`${check.ok ? "ok     " : "problem"}  ${check.message}`);
  const problems = checks.filter((check) => !check.ok).length;
  console.log(
    problems === 0
      ? "No problems."
      : `${problems} problem${problems === 1 ? "" : "s"}: fix ${problems === 1 ? "it" : "them"} and run this again.`,
  );
  process.exit(problems === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "The check stopped before it finished.");
  process.exit(1);
});
