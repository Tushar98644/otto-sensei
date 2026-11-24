import { judgePost, parsePost, type ParsedPost, type ParsedUnit, type PostInput } from "./check";
import type { Place, PlaceGroup } from "./places";
import { WORK_REGIONS, type WorkProfile } from "./profile";
import type { TimeRule } from "./time";
import type { CheckOptions, Claim } from "./verdicts";

// A stored job's work-rights facts: what parsePost read that can make a verdict "blocked", in a few
// bytes instead of the post's text. Quotes, sponsorship offers and job types never block, so they go.
// Sections split by ";": P places, ! flags, R/F/A claims, U rights line, T time rule (JSON).

const GROUPS: readonly PlaceGroup[] = [
  "eu",
  "europe",
  "emea",
  "north_america",
  "latam",
  "americas",
  "apac",
  "anz",
];
const FLAGS = {
  s: "sponsorOffered",
  r: "relocation",
  m: "remote",
  o: "onSite",
  h: "homeRights",
} as const;

const placeToken = (place: Place) =>
  place.kind === "country" ? place.code : String(GROUPS.indexOf(place.group));
const placesText = (places: readonly Place[]) => places.map(placeToken).join(",");

function placesFrom(text: string): Place[] {
  if (!text) return [];
  return text
    .split(",")
    .map((token) =>
      /^\d$/.test(token)
        ? { kind: "group", group: GROUPS[Number(token)] ?? "eu" }
        : { kind: "country", code: token },
    );
}

const claimText = (tag: string, claim: Claim) =>
  `${tag}${claim.moves ? 1 : 0}${placesText(claim.places)}`;

function blocks(unit: ParsedUnit): boolean {
  return unit.time !== null || unit.citizenship || unit.authorization || unit.noSponsor;
}

export function encodeFacts(post: ParsedPost): string {
  const parts: string[] = [];
  if (post.locationPlaces.length > 0) parts.push(`P${placesText(post.locationPlaces)}`);
  const flags = Object.entries(FLAGS)
    .filter(([, key]) => post[key])
    .map(([letter]) => letter)
    .join("");
  if (flags) parts.push(`!${flags}`);
  for (const claim of post.restricted) parts.push(claimText("R", claim));
  if (post.field) parts.push(claimText("F", post.field));
  if (post.anywhere) parts.push(claimText("A", post.anywhere));
  for (const unit of post.units) {
    if (!blocks(unit)) continue;
    if (unit.time) parts.push(`T${JSON.stringify(unit.time).replaceAll(";", "\\u003b")}`);
    const kinds = `${unit.citizenship ? "c" : ""}${unit.authorization ? "a" : ""}${unit.noSponsor ? "n" : ""}`;
    if (!kinds) continue;
    const extra = `${unit.home ? "h" : ""}${unit.permanent ? "p" : ""}`;
    const visa = unit.visa ? WORK_REGIONS.indexOf(unit.visa) : "";
    parts.push(`U${kinds}${extra}:${placesText(unit.places)}:${visa}`);
  }
  return parts.join(";");
}

const NO_UNIT: Omit<ParsedUnit, "time"> = {
  quote: "",
  citizenship: false,
  authorization: false,
  noSponsor: false,
  offer: false,
  places: [],
  home: false,
  visa: null,
  permanent: false,
  fullTime: false,
  contract: false,
};

export function decodeFacts(text: string): ParsedPost {
  const post: ParsedPost = {
    locationPlaces: [],
    sponsorOffered: false,
    relocation: false,
    remote: false,
    onSite: false,
    homeRights: false,
    restricted: [],
    field: null,
    anywhere: null,
    units: [],
  };
  if (!text) return post;
  for (const part of text.split(";")) {
    const tag = part[0];
    const body = part.slice(1);
    const claim = (): Claim => ({
      places: placesFrom(body.slice(1)),
      quote: "",
      source: "post",
      moves: body[0] === "1",
    });
    if (tag === "P") post.locationPlaces = placesFrom(body);
    else if (tag === "!")
      for (const letter of body) post[FLAGS[letter as keyof typeof FLAGS]] = true;
    else if (tag === "R") post.restricted.push(claim());
    else if (tag === "F") post.field = claim();
    else if (tag === "A") post.anywhere = claim();
    else if (tag === "T") post.units.push({ ...NO_UNIT, time: JSON.parse(body) as TimeRule });
    else if (tag === "U") {
      const [kinds = "", places = "", visa = ""] = body.split(":");
      post.units.push({
        ...NO_UNIT,
        time: null,
        citizenship: kinds.includes("c"),
        authorization: kinds.includes("a"),
        noSponsor: kinds.includes("n"),
        home: kinds.includes("h"),
        permanent: kinds.includes("p"),
        places: placesFrom(places),
        visa: visa === "" ? null : (WORK_REGIONS[Number(visa)] ?? null),
      });
    }
  }
  return post;
}

export function postFacts(post: PostInput): string {
  return encodeFacts(parsePost(post));
}

export type BlockedHint = { blocked: boolean; note: string | null };

const decoded = new Map<string, ParsedPost>();
const DECODED_MAX = 5_000;

// What the Jobs tab says when a stored job is likely closed to this person.
export function blockedHint(
  facts: string,
  profile: WorkProfile | null,
  options: CheckOptions,
): BlockedHint {
  if (!facts) return { blocked: false, note: null };
  let post = decoded.get(facts);
  if (!post) {
    if (decoded.size >= DECODED_MAX) decoded.clear();
    post = decodeFacts(facts);
    decoded.set(facts, post);
  }
  const blocked = judgePost(post, profile, options).find(
    (finding) => finding.verdict === "blocked",
  );
  return { blocked: Boolean(blocked), note: blocked?.note ?? null };
}
