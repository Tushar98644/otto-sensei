// Read defensively: an unreadable field is dropped; only a job with no id, title or link is skipped.

export { FeedShapeError, type RawJob } from "./parsers/shared";
export { parseAshby } from "./parsers/ashby";
export { parseGreenhouse } from "./parsers/greenhouse";
export { parseHimalayas, type HimalayasPage } from "./parsers/himalayas";
export { parseJobicy, type JobicyPage } from "./parsers/jobicy";
export { parseLever } from "./parsers/lever";
export { parsePersonio } from "./parsers/personio";
export { parseRecruitee, recruiteeJob, type RecruiteeOfferShape } from "./parsers/recruitee";
export { parseRemoteOk } from "./parsers/remoteok";
export { parseWorkable } from "./parsers/workable";
