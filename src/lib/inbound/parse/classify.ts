import type { EmailKind } from "../types";
import { flat, sentences } from "./text";

type Rule = readonly [RegExp, number];
type Scored = Exclude<EmailKind, "unknown">;

const VERB =
  "(?:moving|move|proceed(?:ing)?|progress(?:ing)?|taking|take|advanc(?:e|ing)|continu(?:e|ing)|going|go)";

const RULES: Record<Scored, readonly Rule[]> = {
  rejected: [
    [
      new RegExp(
        `\\b(?:not|won't|unable to|cannot|can't) (?:be )?(?:able to )?${VERB} (?:forward |further |ahead )?(?:with )?(?:your|you)\\b`,
      ),
      3,
    ],
    [
      new RegExp(
        `\\bdecided (?:not to ${VERB}|to ${VERB} (?:forward |ahead )?with (?:other|another|a different|candidates|applicants|someone)|to pursue other|to go with (?:other|another|a different))`,
      ),
      3,
    ],
    [
      new RegExp(
        `\\b${VERB} (?:forward |ahead )?with (?:other|another|a different) (?:candidate|applicant|profile)`,
      ),
      3,
    ],
    [/\bpursue other (?:candidates|applicants|profiles)/, 3],
    [/\b(?:have|has|were|was|are|is) not (?:been )?(?:selected|shortlisted|successful|chosen)/, 3],
    [/\bregret to (?:inform|let you know|tell|share)/, 3],
    [
      /\b(?:position|role|vacancy|opening|requisition) (?:has|have) (?:now )?been (?:filled|closed)/,
      3,
    ],
    [/\bunsuccessful\b/, 3],
    [/\bnot (?:a|the) (?:right |strong )?(?:fit|match) for (?:this|the|our)/, 3],
    [/\b(?:will|would) not be (?:able to )?(?:offer|extend)/, 3],
    [/\bunable to offer you/, 3],
    [/\bno longer (?:being |under )?consider/, 3],
    [
      /\b(?:application|candidature|candidacy|profile) (?:has been |was |is )?(?:rejected|declined)\b/,
      3,
    ],
    [/\bstatus:? (?:not selected|rejected|declined)\b/, 3],
    [/\b(?:go|going|gone|went) (?:in )?(?:a )?(?:different|another) direction/, 3],
    [/\bunfortunately\b/, 1],
    [/\bafter careful (?:consideration|review|thought)/, 1],
    [/\bother candidates\b/, 1],
    [/\b(?:keep|retain) your (?:resume|cv|details|profile) (?:on file|in our)/, 1],
  ],
  offer: [
    [
      /\b(?:pleased|delighted|happy|excited|thrilled|glad) to (?:offer you|extend (?:you )?(?:an|the|this|a formal) (?:job )?offer|make you an offer|share (?:your|the) offer)/,
      3,
    ],
    [/\boffer (?:letter|of employment)\b/, 3],
    [/\b(?:extend|extending) (?:to )?you (?:an|a formal|the) (?:job )?offer/, 3],
    [/\byour (?:job )?offer (?:from|at|letter|details|is attached|is ready)/, 3],
    [/\b(?:have been|are|been) selected for the (?:position|role|post) of\b/, 3],
    [/\bwelcome (?:to the team|aboard)\b/, 2],
  ],
  interview: [
    [
      /\binvit(?:e|ing) you (?:to|for) (?:an? |the |your )?(?:[a-z0-9-]+ ){0,3}(?:interview|call|chat|conversation|screen(?:ing)?|meeting|round|discussion)\b/,
      3,
    ],
    [
      /\b(?:are|were|have been|been|being) invited (?:to|for) (?:an? |the |your )?(?:[a-z0-9-]+ ){0,3}(?:interview|call|chat|conversation|screen(?:ing)?|meeting|round|discussion)\b/,
      3,
    ],
    [
      /\b(?:schedule|book|arrange|set up|organi[sz]e|confirm) (?:a |an |the |your )?(?:time|call|chat|interview|phone screen|conversation|meeting|discussion|slot)\b/,
      3,
    ],
    [
      /\binterview (?:invitation|invite|request|confirmation|confirmed|scheduled|details|slot|schedule|is (?:confirmed|scheduled|booked|set))\b/,
      3,
    ],
    [/\b(?:your|the) (?:[a-z-]+ )?interview (?:with|for|at|on|has been|is)\b/, 3],
    [
      /\b(?:calendly\.com|goodtime\.io|cal\.com\/|ashbyhq\.com\/[^\s]*schedul|greenhouse\.io\/[^\s]*schedul|gem\.com\/[^\s]*schedul|meet\.google\.com|zoom\.us\/j\/|teams\.microsoft\.com\/l\/meetup)/,
      3,
    ],
    [/\b(?:like|love|want) to (?:speak|talk|chat|meet|connect) (?:with you|further|more)/, 3],
    [
      /\b(?:availability|available times?|time slots?) for (?:a |an |the )?(?:call|interview|chat|conversation|discussion)/,
      3,
    ],
    [/\b(?:share|send|let us know|provide|confirm) your availability/, 3],
    [/\b(?:pick|choose|select) (?:a |an )?(?:time|slot)\b/, 3],
    [
      /\b(?:selected|shortlisted|moved|move you|advance you|advancing you|progress you) (?:for|to) (?:the )?(?:next|following|interview|final|technical|hr) (?:round|stage|step|interview)/,
      3,
    ],
    [/\bshortlisted for (?:an? |the )?(?:interview|discussion)/, 3],
    [
      /\b(?:walk-in|face to face|face-to-face|f2f|virtual|video|telephonic|phone|technical|onsite|on-site|final|first|second|hr|panel|managerial) (?:interview|round|screen)\b/,
      2,
    ],
    [/\binterview\b/, 1],
  ],
  assessment: [
    [
      /\b(?:hackerrank|codility|codesignal|hackerearth|mettl|testgorilla|coderbyte|codingame|karat|hirevue|imocha|wheebox|amcat|byteboard|devskiller|testdome|vervoe|pymetrics|harver)\b/,
      3,
    ],
    [
      /\b(?:online|coding|technical|aptitude|skills?|cognitive|personality|psychometric|take-home|take home|written|programming) (?:assessment|test|challenge|exercise|assignment|evaluation)\b/,
      3,
    ],
    [
      /\b(?:complete|take|attempt|finish) (?:an? |the |our |this |your )?(?:online |short |brief |next )?(?:assessment|test|challenge|assignment|exercise|questionnaire)\b/,
      3,
    ],
    [/\bassessment (?:link|invitation|invite|details|window)\b/, 3],
    [/\binvit(?:e|ed|ing) (?:you )?to (?:take|complete|attempt)\b/, 3],
    [/\bassessment\b/, 1],
  ],
  applied: [
    [/\b(?:received|receiving|got) your (?:job )?application/, 3],
    [
      /\byour (?:job )?application (?:for [^.]{2,120} )?(?:has been|was|is|got|have been) (?:successfully )?(?:received|submitted|sent|delivered|completed|recorded|viewed)/,
      3,
    ],
    [
      /\bthank(?:s| you) (?:so much )?for (?:applying|your (?:job )?application|submitting your|your interest in (?:joining|working|the|our|this|a)|considering)/,
      3,
    ],
    [/\b(?:successfully|you) (?:applied|submitted)\b/, 3],
    [/\bapplied successfully\b/, 3],
    [/\bapplication (?:received|submitted|confirmation|sent|acknowledg(?:e)?ment)\b/, 3],
    [/\byour application was (?:sent|viewed)/, 3],
    [/\bwe(?:'ve| have) (?:got|received) your/, 3],
    [/\bapplication is (?:now )?(?:under|being) (?:review|reviewed|considered)/, 3],
    [/^indeed application:/, 3],
    [/\backnowledge (?:the )?receipt of your (?:job )?(?:application|resume|cv|profile)/, 3],
  ],
};

// Sentences about what might happen ("if you're shortlisted, we'll schedule an interview") don't count.
const MAYBE =
  /\b(?:if|should|whether|in case|in the event|once|when|unless|after we|as soon as|until)\b[^.]{0,80}\b(?:you|your|we|our|the team|they|selected|shortlisted|qualified|match|fit)\b|\b(?:may|might|will|would|could) (?:be )?(?:in touch|reach out|contact|get back|be contacting|let you know|follow up|be reaching out|review)\b|\bif (?:so|not)\b/;

type Score = { total: number; strong: boolean };

function score(text: string, rules: readonly Rule[]): Score {
  let total = 0;
  let strong = false;
  for (const [pattern, weight] of rules) {
    if (!pattern.test(text)) continue;
    total += weight;
    if (weight >= 3) strong = true;
  }
  return { total, strong };
}

function scoreOf(subject: string, body: string): Record<Scored, Score> {
  const said = sentences(body).filter((sentence) => !MAYBE.test(sentence.toLowerCase()));
  const firm = `${flat(subject)} . ${flat(said.join(" \n"))}`;
  const all = `${flat(subject)} . ${flat(body)}`;
  return {
    rejected: score(firm, RULES.rejected),
    offer: score(firm, RULES.offer),
    interview: score(firm, RULES.interview),
    assessment: score(firm, RULES.assessment),
    applied: score(all, RULES.applied),
  };
}

const ALERT =
  /\b(?:job alert|jobs? (?:for you|you may|you might|matching|based on)|recommended (?:jobs|for you)|new jobs|top job picks|is hiring|are hiring|people (?:also )?viewed|who viewed your profile|profile views?|weekly digest|newsletter|webinar|career tips|jobs in your area|similar jobs|apply now to|\d+ new (?:jobs|matches|opportunities))\b/;

export function isAlert(subject: string, body: string, listed: boolean): boolean {
  const text = `${flat(subject)} ${flat(body).slice(0, 2_000)}`;
  return (
    ALERT.test(text) ||
    (listed &&
      /\b(?:unsubscribe|manage (?:your )?(?:alerts|notifications))\b/.test(text) &&
      !/\byour application\b/.test(text))
  );
}

export function classify(subject: string, body: string): EmailKind {
  const { rejected, offer, interview, assessment, applied } = scoreOf(
    subject,
    body.slice(0, 12_000),
  );
  if (rejected.strong) return "rejected";
  if (offer.strong) return "offer";
  // Interviews and tests need a firm phrase: a process description alone moves nothing.
  if (interview.strong || assessment.strong) {
    if (!assessment.strong) return "interview";
    if (!interview.strong) return "assessment";
    return assessment.total >= interview.total ? "assessment" : "interview";
  }
  if (rejected.total >= 2) return "rejected";
  if (applied.strong) return "applied";
  return "unknown";
}
