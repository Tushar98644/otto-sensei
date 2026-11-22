import { neighboursOf, occupationCodes } from "./occupations";
import { familyOfOccupation } from "./roles";
import type { RoleFamily } from "./types";

// The kinds of work a role may be matched with, however many skills another job shares: the role's
// own occupation, the group it's listed in below, else O*NET's closest occupations to it.
// Each entry is a code or the start of one ("29-1141" is every registered nurse specialty).
const ROLE_GROUPS: readonly (readonly string[])[] = [
  // Software: backend, frontend, full-stack, mobile, DevOps and SRE, QA and SDET, security,
  // data and ML engineering, and engineering managers. Not technical support, sales engineering,
  // marketing or finance.
  [
    "11-3021",
    "15-1251",
    "15-1252",
    "15-1253",
    "15-1254",
    "15-1299.08",
    "15-1299.05",
    "15-1243",
    "15-1241",
    "15-1221",
    "15-2051.00",
  ],
  // Data and ML: analysts, scientists, statisticians, analytics and data engineers.
  ["15-2051", "15-2041", "15-2031", "15-1243.01", "15-1221", "13-2099.01"],
  // Design: product, UX and UI, visual and graphic.
  ["15-1255", "27-1024"],
  // Product: product managers and owners, technical program managers.
  ["11-X101", "15-1299.09"],
  // Marketing: marketing and growth, search, advertising, PR, copywriting.
  ["11-2021", "11-2011", "11-2032", "13-1161", "27-3031", "27-3043"],
  // Sales: account executives, SDRs and BDRs, account managers, sales engineers, partnerships.
  ["41-4011", "41-4012", "41-3091", "41-9031", "11-2022", "41-1012", "41-X102", "41-X101"],
  // Support: customer success, customer service, help desk.
  ["41-X101", "43-4051", "15-1232", "15-1231"],
  // Legal: lawyers, clerks, paralegals, compliance.
  ["23-1011", "23-1012", "23-2011", "13-1041", "11-9199.02"],
  // Accounting and finance: accountants and auditors, controllers, tax, bookkeeping, FP&A, payroll.
  ["13-2011", "11-3031", "13-2061", "13-2082", "13-2051", "13-2031", "43-3031", "43-3051"],
  // Nursing: registered nurses of every specialty, nurse practitioners, LPNs, midwives.
  ["29-1141", "29-1171", "29-2061", "29-1161", "29-1151"],
];

export type RoleGate = {
  // Occupations a job may have to be shown; none for a role named only by its kind.
  codes: readonly string[];
  // Without codes, or for a job no occupation was read for, its kind of role must be this one.
  family: RoleFamily | null;
};

const startsAny = (code: string, prefixes: readonly string[]) =>
  prefixes.some((prefix) => code.startsWith(prefix));

const gates = new Map<string, readonly string[]>();

function allowedCodes(target: string): readonly string[] {
  const known = gates.get(target);
  if (known) return known;
  const groups = ROLE_GROUPS.filter((group) => startsAny(target, group));
  const prefixes =
    groups.length > 0 ? groups.flat() : [target.slice(0, 7), ...neighboursOf(target).close];
  const codes = occupationCodes().filter((code) => code === target || startsAny(code, prefixes));
  gates.set(target, codes);
  return codes;
}

// "Any role", with no occupation and no kind, lets the skills decide, as before.
export function roleGate(role: {
  occupation: string | null;
  family: RoleFamily | null;
}): RoleGate | null {
  if (role.occupation) {
    return {
      codes: allowedCodes(role.occupation),
      family: role.family ?? familyOfOccupation(role.occupation),
    };
  }
  return role.family ? { codes: [], family: role.family } : null;
}

export function gateAllows(
  gate: RoleGate | null,
  job: { occupation?: string | null; family?: RoleFamily | null },
): boolean {
  if (!gate) return true;
  if (gate.codes.length > 0 && job.occupation) return gate.codes.includes(job.occupation);
  return Boolean(job.family) && job.family === gate.family;
}
