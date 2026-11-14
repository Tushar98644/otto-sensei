// Read-only: checks the Paddle prices and keys in the env against the app. bun --env-file=.env.paddle.local scripts/check-paddle-catalog.ts
import { catalogConfig, runCatalogCheck } from "../src/lib/billing/paddle-catalog";

async function main() {
  const config = catalogConfig();
  console.log(`Paddle ${config.environment} catalog`);
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
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
