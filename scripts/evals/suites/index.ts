import type { AnySuite } from "../suite";
import { fixSuite } from "./fix";
import { interviewSuite } from "./interview";
import { lettersSuite } from "./letters";
import { matchCheckSuite } from "./match-check";
import { structureSuite } from "./structure";
import { tailorSuite } from "./tailor";

// One import and one entry per suite, in name order.
export const SUITES: readonly AnySuite[] = [
  fixSuite,
  interviewSuite,
  lettersSuite,
  matchCheckSuite,
  structureSuite,
  tailorSuite,
];
