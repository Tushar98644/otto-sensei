import { describe, expect, it } from "vitest";
import { classifyTitle, neighboursOf, occupationOf, readTitle, searchOccupations } from "./index";
import { CUSTOM_OCCUPATIONS, CUSTOMER_SUCCESS, PRODUCT_MANAGER, TECH_NAMES } from "./tech";
import { titleParts } from "./title";

const codeOf = (title: string) => classifyTitle(title)?.code ?? null;

// Real titles from the job pool (2026-11-10) and from boards in the UK, Australia and Canada.
describe("classifyTitle", () => {
  it.each([
    // Healthcare
    ["Registered Nurse - ICU - Nights", "29-1141.00"],
    ["Registered Nurse (RN) – Med/Surg – $10,000 Sign-On Bonus", "29-1141.00"],
    ["Registered General Nurse", "29-1141.00"],
    ["Staff Nurse", "29-1141.00"],
    ["LPN", "29-2061.00"],
    ["Family Nurse Practitioner", "29-1171.00"],
    ["Certified Nursing Assistant (CNA) - Night Shift", "31-1131.00"],
    ["Healthcare Assistant", "31-1131.00"],
    ["Care Assistant - Nights", "31-1131.00"],
    ["Home Health Aide", "31-1121.00"],
    ["Pharmacist", "29-1051.00"],
    ["Pharmacy Technician", "29-2052.00"],
    ["Phlebotomist", "31-9097.00"],
    ["Medical Assistant", "31-9092.00"],
    // Education
    ["Primary School Teacher", "25-2021.00"],
    ["High School Math Teacher", "25-2031.00"],
    ["Teacher of Maths", "25-2031.00"],
    ["Teaching Assistant", "25-9042.00"],
    ["Early Years Practitioner", "25-2011.00"],
    ["Early Childhood Educator", "25-2011.00"],
    // Retail and hospitality
    ["Sales Associate, Part-Time - Bloomingdale's", "41-2031.00"],
    ["Retail Assistant", "41-2031.00"],
    ["Store Manager", "41-1011.00"],
    ["Floor Lead (Retail) (Part-time)", "41-1011.00"],
    ["Cashier", "41-2011.00"],
    ["Line Cook", "35-2014.00"],
    ["Sous Chef (Full Time) - Sydney CBD", "35-1011.00"],
    ["Chef de Partie", "35-1011.00"],
    ["Kitchen Porter", "35-9021.00"],
    ["Barista", "35-3023.01"],
    ["Server", "35-3031.00"],
    ["Restaurant Manager", "11-9051.00"],
    ["Shift Supervisor", "35-1012.00"],
    ["Night Auditor", "43-4081.00"],
    // Logistics and driving
    ["Truck Driver CDL-A - Home Weekly", "53-3032.00"],
    ["HGV Class 1 Driver", "53-3032.00"],
    ["Lorry Driver", "53-3032.00"],
    ["Delivery Driver", "53-3033.00"],
    ["Warehouse Associate", "53-7062.00"],
    ["Warehouse Operative", "53-7062.00"],
    ["Forklift Operator", "53-7051.00"],
    // Trades and manufacturing
    ["Journeyman Electrician", "47-2111.00"],
    ["Electrician (Commercial) - Night Shift", "47-2111.00"],
    ["HVAC Service Technician", "49-9021.00"],
    ["Plasterer", "47-2161.00"],
    ["Joiner", "47-2031.00"],
    ["Site Manager", "11-9021.00"],
    ["CNC Machinist", "51-4041.00"],
    ["Production Supervisor - 2nd Shift", "51-1011.00"],
    ["Welder/Fabricator", "51-4121.00"],
    // Science, public sector, office, creative
    ["Research Associate II, Cell Therapy", "19-4021.00"],
    ["Police Officer", "33-3051.00"],
    ["Policy Analyst", "19-3094.00"],
    ["Solicitor", "23-1011.00"],
    ["Chartered Accountant", "13-2011.00"],
    ["Staff Accountant", "13-2011.00"],
    ["Bookkeeper", "43-3031.00"],
    ["Bank Teller - Part Time", "43-3071.00"],
    ["Administrative Assistant", "43-6014.00"],
    ["Receptionist", "43-4171.00"],
    ["Customer Service Representative - Work From Home", "43-4051.00"],
    ["Video Editor", "27-4032.00"],
    ["Senior Copywriter", "27-3043.00"],
    ["Graphic Designer", "27-1024.00"],
    ["Director of Nursing", "11-9111.00"],
  ])("%s -> %s", (title, code) => {
    expect(codeOf(title)).toBe(code);
  });

  // MATCHING-RESEARCH.md, Round 2 (c): O*NET's own title list files these under Urban Planners,
  // Marketing Managers, Advertising Managers and office supervisors.
  it.each([
    ["Developer Advocate", "15-1252.00"],
    ["Founding Engineer", "15-1252.00"],
    ["Member of Technical Staff", "15-1252.00"],
    ["Forward Deployed Engineer", "15-1252.00"],
    ["Senior Backend Engineer, Payments", "15-1252.00"],
    ["Senior Site Reliability Engineer", "15-1299.08"],
    ["Solutions Engineer", "41-9031.00"],
    ["Senior Product Manager, Growth", PRODUCT_MANAGER],
    ["Director of Product", PRODUCT_MANAGER],
    ["Customer Success Manager", CUSTOMER_SUCCESS],
    ["Account Executive, Enterprise", "41-4011.00"],
    ["Program Manager", "13-1082.00"],
    ["Manager, Software Engineering", "11-3021.00"],
    ["Head of Sales", "11-2022.00"],
    ["Contract Senior Data Analyst (SQL)", "15-2051.01"],
  ])("startup role %s -> %s", (title, code) => {
    expect(codeOf(title)).toBe(code);
  });

  it("names the business function of office titles no name covers", () => {
    expect(codeOf("Director, Talent Analytics")).toBe("11-3121.00");
    expect(codeOf("Learning Design and Enablement Manager")).toBe("11-3131.00");
    expect(classifyTitle("Director, Talent Analytics")?.via).toBe("function");
  });

  it("leaves a title unknown rather than guess from a generic word", () => {
    for (const title of [
      "Manager",
      "Associate",
      "Team Lead",
      "Senior Engineer",
      "Hourly Positions at CookUnity Inc",
      "General Application",
      "Pflegefachkraft (m/w/d)",
      "Area Vice President, West",
    ]) {
      expect(codeOf(title), title).toBeNull();
    }
  });

  it("doesn't read a US state or a place as a job", () => {
    // "PA" is also a physician assistant; only initials in the title's first part count.
    expect(codeOf("Chaplain (Part-Time) - Lancaster, PA")).not.toBe("29-1071.00");
    expect(codeOf("Nurse Recruiter")).toBe("13-1071.00");
  });
});

describe("titleParts", () => {
  it("drops hours, contract words, codes and gender markers but keeps words that are jobs", () => {
    expect(titleParts("Registered Nurse (m/w/d) - Full Time Nights - REQ-12345")).toEqual([
      ["registered", "nurse"],
      ["req"],
    ]);
    expect(titleParts("Bank Teller")).toEqual([["bank", "teller"]]);
    expect(titleParts("Night Auditor")).toEqual([["night", "auditor"]]);
    expect(titleParts("Home Health Aide - Per Diem")).toEqual([["home", "health", "aide"]]);
    expect(titleParts("Software Engineering Intern, Summer 2027")).toEqual([
      ["software", "engineering"],
    ]);
  });

  it("reads British spellings and shorthand as the US words O*NET uses", () => {
    expect(titleParts("Labourer")).toEqual([["laborer"]]);
    expect(titleParts("Paediatric Nurse")).toEqual([["pediatric", "nurse"]]);
    expect(titleParts("HGV Driver")).toEqual([["heavy", "goods", "vehicle", "driver"]]);
    expect(titleParts("Pharmacy Tech")).toEqual([["pharmacy", "technician"]]);
    expect(titleParts("Scheduling &amp; Coordinating")).toEqual([
      ["scheduling", "and", "coordinating"],
    ]);
  });
});

describe("readTitle", () => {
  it("keeps a kind of role only when the occupation allows it", () => {
    expect(readTitle("Senior Backend Engineer")).toEqual({
      family: "engineering",
      occupation: "15-1252.00",
    });
    // The title rules read these as support, sales and engineering.
    expect(readTitle("Support Worker").family).toBeNull();
    expect(readTitle("Retail Sales Associate").family).toBeNull();
    expect(readTitle("Mechanical Engineer").family).toBeNull();
    expect(readTitle("Registered Nurse")).toEqual({ family: null, occupation: "29-1141.00" });
  });
});

describe("occupation data", () => {
  it("names occupations in plain words", () => {
    expect(occupationOf("29-1141.00")?.name).toBe("Registered Nurse");
    expect(occupationOf("53-3032.00")?.zone).toBe(2);
    expect(occupationOf(PRODUCT_MANAGER)).toMatchObject({ name: "Product Manager", major: "11" });
    expect(occupationOf("99-9999.00")).toBeNull();
  });

  it("knows every code our own names and neighbours point to", () => {
    for (const [, code] of TECH_NAMES) expect(occupationOf(code), code).not.toBeNull();
    for (const custom of CUSTOM_OCCUPATIONS)
      for (const code of [...custom.close, ...custom.related])
        expect(occupationOf(code), code).not.toBeNull();
  });

  it("relates occupations the way people move between them", () => {
    const { close, related } = neighboursOf("29-1141.00");
    expect(close).toEqual(expect.arrayContaining(["29-1171.00", "29-2061.00", "29-1141.01"]));
    expect(related).toContain("31-1131.00");
    // Where an EMT can move to doesn't make EMT jobs close to a nurse's.
    expect(close).not.toContain("29-2042.00");
  });
});

describe("searchOccupations", () => {
  it("finds an occupation by any of its names", () => {
    expect(searchOccupations("registered nurse")[0]?.name).toBe("Registered Nurse");
    expect(searchOccupations("RN")[0]?.code).toBe("29-1141.00");
    expect(searchOccupations("hgv driver")[0]?.code).toBe("53-3032.00");
    expect(searchOccupations("solicitor")[0]?.code).toBe("23-1011.00");
    expect(searchOccupations("pharm").map((item) => item.name)).toContain("Pharmacist");
    expect(searchOccupations("")).toEqual([]);
  });
});

describe("speed", () => {
  it("reads a title in well under a millisecond once built", () => {
    classifyTitle("Warm up the index");
    const titles = Array.from({ length: 2_000 }, (_, i) => `Senior Store Manager ${i} - Sydney`);
    const started = performance.now();
    for (const title of titles) classifyTitle(title);
    expect((performance.now() - started) / titles.length).toBeLessThan(0.2);
  });
});
