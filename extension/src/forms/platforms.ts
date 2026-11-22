import { jobSiteOf } from "@/lib/extension/urls";
import { all, oneLine, type PageNode } from "../page/dom";

// The application forms Fill with Otto works on. LinkedIn's and Naukri's own Easy Apply are never among them.
export const FORM_PLATFORMS = ["greenhouse", "lever", "ashby", "workday"] as const;
export type FormPlatform = (typeof FORM_PLATFORMS)[number];

export function formPlatformOf(url: string): FormPlatform | null {
  const site = jobSiteOf(url);
  return (FORM_PLATFORMS as readonly string[]).includes(site) ? (site as FormPlatform) : null;
}

type PlatformRules = {
  // Where the form lives; the first that matches wins.
  roots: readonly string[];
  // An element that holds one question: its label and its control or options.
  isContainer: (node: PageNode) => boolean;
  label: readonly string[];
  // Buttons that send the application, watched so "Applied" follows a real submit.
  submit: readonly string[];
  confirmedUrl: (url: URL) => boolean;
};

const cls = (node: PageNode) => ` ${node.getAttribute("class") ?? ""} `;
const hasClass = (node: PageNode, name: string) => cls(node).includes(` ${name} `);

export const PLATFORMS: Record<FormPlatform, PlatformRules> = {
  greenhouse: {
    roots: ["#application-form", "#application_form", "form#application_form", "#application"],
    isContainer: (node) =>
      hasClass(node, "field-wrapper") ||
      hasClass(node, "select__container") ||
      hasClass(node, "checkbox__wrapper") ||
      node.tagName === "FIELDSET" ||
      hasClass(node, "field"),
    label: ["label", "legend", ".label"],
    submit: ["button[type='submit']", "input[type='submit']", "#submit_app"],
    confirmedUrl: (url) =>
      /\/confirmation\/?$/.test(url.pathname) ||
      url.pathname.startsWith("/embed/job_app/confirmation"),
  },
  lever: {
    roots: ["#application-form", "form.application-form", "form"],
    isContainer: (node) =>
      hasClass(node, "application-question") || hasClass(node, "application-additional"),
    label: [".application-label", "label"],
    submit: ["#btn-submit", "button[type='submit']", ".template-btn-submit"],
    confirmedUrl: (url) => /^\/[^/]+\/[0-9a-f-]{36}\/thanks\/?$/i.test(url.pathname),
  },
  ashby: {
    roots: [".ashby-application-form-container", "form"],
    isContainer: (node) => hasClass(node, "ashby-application-form-field-entry"),
    label: [".ashby-application-form-question-title", "label"],
    submit: [".ashby-application-form-submit-button", "button[type='submit']"],
    confirmedUrl: () => false,
  },
  workday: {
    roots: ["[data-automation-id='applyFlowPage']", "main", "[role='main']"],
    isContainer: (node) => (node.getAttribute("data-automation-id") ?? "").startsWith("formField-"),
    label: ["label", "legend"],
    submit: ["[data-automation-id='bottom-navigation-next-button']", "button[type='submit']"],
    confirmedUrl: () => false,
  },
};

export function formRoot(platform: FormPlatform, root: PageNode): PageNode | null {
  for (const selector of PLATFORMS[platform].roots) {
    const found = root.querySelector(selector);
    if (found && found.querySelector("input, textarea, select, button")) return found;
  }
  return null;
}

const CONFIRMED = [
  /thank(?:s| you) for (?:applying|your application|your interest)/i,
  /application (?:has been |was )?(?:successfully )?(?:submitted|received|sent)/i,
  /we(?:'ve| have) received your application/i,
  /your application (?:is|was) (?:in|complete)/i,
];

const CONFIRM_SCOPES: Record<FormPlatform, readonly string[]> = {
  greenhouse: [
    "#application_confirmation",
    ".application-confirmation",
    "main",
    "#content",
    "body",
  ],
  lever: [".application-confirmation", ".section-wrapper", "main", "body"],
  ashby: [
    ".ashby-application-form-success-container",
    "[class*='_successContainer']",
    ".ashby-application-form-container",
    "main",
  ],
  workday: [
    "[data-automation-id='congratulationsPopup']",
    "[data-automation-id='applyFlowPage']",
    "[role='dialog']",
    "main",
  ],
};

// A sent application: its thank-you address, or (once a submit was pressed) the page saying so in place of the form.
export function confirmation(
  platform: FormPlatform,
  url: string,
  root: PageNode,
  submitted: boolean,
): boolean {
  let link: URL;
  try {
    link = new URL(url);
  } catch {
    return false;
  }
  if (PLATFORMS[platform].confirmedUrl(link)) return true;
  if (!submitted) return false;
  // The form still showing means the submit failed (a missing answer), whatever else the page says.
  const form = formRoot(platform, root);
  if (form && all(form, "input, textarea").length > 3) return false;
  for (const selector of CONFIRM_SCOPES[platform]) {
    for (const node of all(root, selector)) {
      const text = oneLine(node.textContent).slice(0, 4_000);
      if (CONFIRMED.some((pattern) => pattern.test(text))) return true;
    }
  }
  return false;
}
