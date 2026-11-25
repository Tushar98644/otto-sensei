// Small text helpers shared by the email rules.

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[   ​﻿]/g, " ")
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n");
}

// One line, lower case: what the phrase rules read.
export function flat(text: string): string {
  return normalizeText(text).replace(/\n+/g, " ").toLowerCase().trim();
}

export function sentences(text: string): string[] {
  return normalizeText(text)
    .split(/\n{2,}|(?<=[.!?])\s+(?=[\p{Lu}¿¡"'(])|\n(?=[-*•])/u)
    .map((sentence) => sentence.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

const NOT_A_NAME =
  /^(?:us|you|your|our|we|it|them|this|that|the|a|an|team|the team|our team|the company|our company|this company|this role|this position|the position|the role|this job|the job|a role|an opportunity|this opportunity|the opportunity|careers?|jobs?|hiring|recruiting|recruitment|talent|hr|no-?reply|noreply|do not reply|notifications?|candidates?|applicants?|hiring team|talent team|recruiting team|people team|greenhouse|lever|ashby|workday|smartrecruiters|icims|taleo|workable|naukri|linkedin|indeed|gmail|google|application|applications|interview|update|status|acknowledg(?:e)?ment|reminder|important|urgent|congratulations|confirmation|confirmed|thank you|thanks|hello|hi|greetings|dear candidate|candidate|next steps?|invitation|offer|assessment|test|regards|your application|technical interview)$/i;

function trimEdges(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[\s"'*_:\-|,(]+|[\s"'*_:\-|,.!?;)]+$/g, "")
    .trim();
}

export function cleanCompany(value: string | undefined): string {
  if (!value) return "";
  let name = trimEdges(value)
    .replace(/^(?:the|team)\s+/i, "")
    .replace(
      /\s+(?:via|through|using|on|@)\s+(?:greenhouse|lever|ashby|workday|smartrecruiters|icims|taleo|workable|linkedin|indeed|naukri)\b.*$/i,
      "",
    )
    .replace(
      /\s*[-|,:]?\s*(?:talent acquisition|talent team|talent|recruiting team|recruiting|recruitment team|recruitment|careers? team|careers?|hiring team|hiring|hr team|hr|human resources|people team|people ops|jobs|team)$/i,
      "",
    )
    .replace(/'s$/i, "");
  name = trimEdges(name);
  if (name.length < 2 || name.length > 80 || NOT_A_NAME.test(name) || /[@<>]|https?:/i.test(name)) {
    return "";
  }
  if (/\b(?:role|position|job|opening|vacancy|post|application)$/i.test(name)) return "";
  if (name.split(" ").length > 7) return "";
  return name;
}

export function cleanRole(value: string | undefined): string {
  if (!value) return "";
  const role = trimEdges(
    trimEdges(value)
      .replace(/^(?:the|our|a|an|this|your)\s+/i, "")
      .replace(/\s*\((?:[mwfdhx]|gn)(?:\s*\/\s*(?:[mwfdhx]|gn)){1,3}\)?(?=\s|$)/gi, "")
      .replace(
        /\s*[([](?:job\s*)?(?:id|req(?:uisition)?|ref|number|no\.?|#)?\s*[:#]?\s*[A-Z]{0,4}[-_]?\d{3,}[^)\]]*[)\]]/gi,
        "",
      )
      .replace(/\s*[-|,]\s*(?:job\s*)?(?:id|req(?:uisition)?|ref)\s*[:#]?\s*\S+$/i, "")
      .replace(/\s*[-|,]?\s*\(?(?:R|JR|REQ)-?\d{3,}\)?$/i, "")
      .replace(/\s+(?:position|role|job|opening|vacancy|post|opportunity)$/i, ""),
  );
  if (
    role.length < 2 ||
    role.length > 120 ||
    NOT_A_NAME.test(role) ||
    /[@<>]|https?:/i.test(role)
  ) {
    return "";
  }
  if (role.split(" ").length > 14) return "";
  return role;
}

export function titleCase(slug: string): string {
  return slug
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export type Sender = { name: string; address: string; domain: string };

export function parseSender(value: string): Sender {
  const text = value.trim();
  const angle = /^(.*?)<\s*([^<>\s]+@[^<>\s]+)\s*>/.exec(text);
  const paren = /^([^\s()]+@[^\s()]+)\s*\(([^)]*)\)/.exec(text);
  const bare = /([^\s<>"',;:]+@[^\s<>"',;:]+)/.exec(text);
  const address = (angle?.[2] ?? paren?.[1] ?? bare?.[1] ?? "")
    .toLowerCase()
    .replace(/^mailto:/, "");
  const name = (angle?.[1] ?? paren?.[2] ?? "")
    .trim()
    .replace(/^"(.*)"$/, "$1")
    .replace(/\\"/g, '"');
  const domain = address.includes("@") ? address.slice(address.lastIndexOf("@") + 1) : "";
  return { name: name.trim(), address, domain };
}

export function domainIs(domain: string, roots: readonly string[]): boolean {
  return roots.some((root) => domain === root || domain.endsWith(`.${root}`));
}
