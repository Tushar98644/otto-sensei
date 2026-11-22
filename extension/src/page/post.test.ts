import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pageFromHtml } from "../testing/mini-dom";
import { postFromSelection, readDeclaredPost, readPost } from "./post";

function page(file: string, url: string) {
  return pageFromHtml(
    readFileSync(new URL(`../../fixtures/${file}`, import.meta.url), "utf8"),
    url,
  );
}

type Case = {
  file: string;
  url: string;
  expected: {
    site: string;
    url: string;
    title: string;
    company: string;
    location: string;
    source: string;
  };
  says: string[];
};

const CASES: Case[] = [
  {
    file: "linkedin-guest.html",
    url: "https://www.linkedin.com/jobs/view/python-backend-engineer-at-hitachi-4471319619/?trk=public_jobs",
    expected: {
      site: "linkedin",
      url: "https://www.linkedin.com/jobs/view/4471319619/",
      title: "Python Backend Engineer",
      company: "Hitachi Solutions India Pvt Ltd",
      location: "Pune Division, Maharashtra, India",
      source: "page",
    },
    says: ["Hitachi Solutions"],
  },
  {
    file: "linkedin-search.html",
    url: "https://www.linkedin.com/jobs/search/?currentJobId=4000000002&keywords=designer",
    expected: {
      site: "linkedin",
      url: "https://www.linkedin.com/jobs/view/4000000002/",
      title: "Senior Product Designer",
      company: "Contoso Pay",
      location: "Remote · Asia-Pacific",
      source: "page",
    },
    says: ["- Expert in Figma and prototyping", "fully remote within APAC"],
  },
  {
    file: "linkedin-view.html",
    url: "https://www.linkedin.com/jobs/view/4000000001/",
    expected: {
      site: "linkedin",
      url: "https://www.linkedin.com/jobs/view/4000000001/",
      title: "Staff Platform Engineer",
      company: "Contoso Cloud",
      location: "Remote · United States",
      source: "page",
    },
    says: ["unable to sponsor visas"],
  },
  {
    file: "naukri.html",
    url: "https://www.naukri.com/job-listings-senior-ui-ux-designer-fabrikam-technologies-bengaluru-4-to-8-years-221125000123?src=jobsearchDesk",
    expected: {
      site: "naukri",
      url: "https://www.naukri.com/job-listings-senior-ui-ux-designer-fabrikam-technologies-bengaluru-4-to-8-years-221125000123",
      title: "Senior UI/UX Designer",
      company: "Fabrikam Technologies",
      location: "Bengaluru",
      source: "page",
    },
    says: [
      "Design end-to-end flows for web and mobile in Figma",
      "Key skills\n- UI Design\n- UX Design",
    ],
  },
  {
    file: "indeed.html",
    url: "https://in.indeed.com/viewjob?jk=9848b2dc5272bd9c&from=serp&vjs=3",
    expected: {
      site: "indeed",
      url: "https://in.indeed.com/viewjob?jk=9848b2dc5272bd9c",
      title: "Data Engineer",
      company: "Tailspin Toys",
      location: "Pune, Maharashtra",
      source: "page",
    },
    says: ["- Model data in Snowflake and dbt"],
  },
  {
    file: "greenhouse.html",
    url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002?gh_src=abc",
    expected: {
      site: "greenhouse",
      url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
      title: "AI Transformation Owner, CRO",
      company: "GitLab",
      location: "Remote, United States",
      source: "page",
    },
    says: ["GitLab is the intelligent orchestration platform"],
  },
  {
    file: "greenhouse-embed.html",
    url: "https://job-boards.greenhouse.io/embed/job_app?for=gitlab&token=8638232002",
    expected: {
      site: "greenhouse",
      url: "https://job-boards.greenhouse.io/gitlab/jobs/8638232002",
      title: "AI Transformation Owner, CRO",
      company: "GitLab",
      location: "Remote, United States",
      source: "page",
    },
    says: ["GitLab is the intelligent orchestration platform"],
  },
  {
    file: "lever.html",
    url: "https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd",
    expected: {
      site: "lever",
      url: "https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd",
      title: "Administrative Business Partner",
      company: "Palantir Technologies",
      location: "Singapore, Singapore",
      source: "jsonld",
    },
    says: ["Palantir builds the world’s leading software"],
  },
  {
    file: "ashby.html",
    url: "https://jobs.ashbyhq.com/ramp/34413f8d-26bf-4bbc-8ade-eb309a0e2245",
    expected: {
      site: "ashby",
      url: "https://jobs.ashbyhq.com/ramp/34413f8d-26bf-4bbc-8ade-eb309a0e2245",
      title: "Software Engineer, Security, Cloud",
      company: "Ramp",
      location: "Remote · New York City, NY, USA",
      source: "jsonld",
    },
    says: ["Ramp is building the smart infrastructure"],
  },
  {
    file: "workday.html",
    url: "https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/US-CA-Remote/Senior-Security-Engineer--Detection-Engineering_JR2022836",
    expected: {
      site: "workday",
      url: "https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/US-CA-Remote/Senior-Security-Engineer--Detection-Engineering_JR2022836",
      title: "Senior Security Engineer, Detection Engineering",
      company: "NVIDIA USA",
      location: "US, CA, Remote, United States of America",
      source: "jsonld",
    },
    says: ["NVIDIA Security is seeking a Senior Detection Engineer"],
  },
  {
    file: "smartrecruiters.html",
    url: "https://jobs.smartrecruiters.com/BoschGroup/744000162835320",
    expected: {
      site: "smartrecruiters",
      url: "https://jobs.smartrecruiters.com/BoschGroup/744000162835320",
      title: "Purchasing Quality Manager",
      company: "Bosch Group",
      location:
        "Aerotech Industrial Park Queretaro Carretera Estatal 200, 76295 Queretaro, Queretaro, Mexico",
      source: "page",
    },
    says: ["Gerente responsable de la sección"],
  },
  {
    file: "workable.html",
    url: "https://apply.workable.com/huggingface/j/81B46579FE/",
    expected: {
      site: "workable",
      url: "https://apply.workable.com/huggingface/j/81B46579FE",
      title: "Open-Source Machine Learning Engineer - EMEA Remote",
      company: "Hugging Face",
      location: "Remote · France",
      source: "jsonld",
    },
    says: ["At Hugging Face, we're on a journey to democratize good AI"],
  },
];

describe("reading job posts", () => {
  it.each(CASES)("reads $file", ({ file, url, expected, says }) => {
    const post = readPost(page(file, url));
    expect(post).toMatchObject(expected);
    for (const line of says) expect(post?.text).toContain(line);
    expect(post?.text.length).toBeLessThanOrEqual(20_000);
  });

  it("stays quiet on a supported site's pages that aren't one job", () => {
    const html = readFileSync(
      new URL("../../fixtures/linkedin-search.html", import.meta.url),
      "utf8",
    );
    expect(readPost(pageFromHtml(html, "https://www.linkedin.com/feed/"))).toBeNull();
    expect(
      readPost(pageFromHtml(html, "https://www.linkedin.com/jobs/search/?keywords=backend")),
    ).toBeNull();
    expect(readPost(pageFromHtml(html, "https://boards.greenhouse.io/gitlab"))).toBeNull();
  });

  it("trusts what a single-page site shows over a JobPosting left from the last job", () => {
    const html = readFileSync(
      new URL("../../fixtures/workday.html", import.meta.url),
      "utf8",
    ).replace(
      /<h2 data-automation-id="jobPostingHeader"([^>]*)>[^<]*</,
      '<h2 data-automation-id="jobPostingHeader"$1>Principal Firmware Engineer<',
    );
    const url =
      "https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/US-CA-Santa-Clara/Principal-Firmware-Engineer_JR2000001";
    const post = readPost(pageFromHtml(html, url));
    expect(post).toMatchObject({ title: "Principal Firmware Engineer", source: "page" });
    expect(post?.company).toBe("");
  });

  it("falls back to the page's largest block of text when the site's selectors miss", () => {
    const html = `<html><head><title>Role</title></head><body><nav>Jobs Home About</nav><main><h1>Platform Engineer</h1><div class="x"><p>${"We run the platform behind thousands of stores. ".repeat(4)}</p><ul><li>Kubernetes and Terraform</li><li>Go or Rust</li></ul></div></main></body></html>`;
    const post = readPost(
      pageFromHtml(html, "https://jobs.lever.co/acme/6ed76ce8-4156-4b60-b120-403538bd66cd"),
    );
    expect(post).toMatchObject({ title: "Platform Engineer", source: "readable" });
    expect(post?.text).toContain("- Kubernetes and Terraform");
  });
});

describe("the toolbar button on other sites", () => {
  it("reads a JobPosting the page declares", () => {
    const post = readDeclaredPost(
      page(
        "careers-jsonld.html",
        "https://litware.example.com/careers/product-designer?utm_source=x",
      ),
    );
    expect(post).toMatchObject({
      site: "other",
      url: "https://litware.example.com/careers/product-designer",
      title: "Product Designer",
      company: "Litware",
      location: "Remote · Anywhere",
      source: "jsonld",
    });
  });

  it("asks for a selection when the page declares nothing, and reads what's selected", () => {
    const plain = page("careers-plain.html", "https://proseware.example.com/careers/csm");
    expect(readDeclaredPost(plain)).toBeNull();
    expect(postFromSelection(plain, "Too short")).toBeNull();
    const selected =
      "What you'll bring\n3+ years in customer success or account management for a SaaS product\nSalesforce or HubSpot\nThe right to work in the UK";
    expect(postFromSelection(plain, selected)).toMatchObject({
      title: "Customer Success Manager",
      text: selected,
      source: "selection",
    });
  });
});
