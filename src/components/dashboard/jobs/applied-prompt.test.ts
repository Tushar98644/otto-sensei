import { describe, expect, it } from "vitest";
import {
  answerOpenedJob,
  ASK_FOR_MS,
  KEEP_MS,
  MAX_OPENED_JOBS,
  parseOpenedJobs,
  promptAnnouncement,
  promptsToShow,
  pruneOpenedJobs,
  recordOpen,
  splitByPage,
  stripLine,
  type OpenedJob,
} from "./applied-prompt";

const NOW = new Date(2026, 10, 10, 15).getTime();
const MINUTE = 60 * 1_000;
const DAY = 24 * 60 * MINUTE;

function job(id: string, company = "Northwind") {
  return { id, company, title: "Backend Engineer", url: `https://jobs.lever.co/${company}/${id}` };
}

// Opened at `at`, back on the tab a minute later, asked at `now`.
function due(list: readonly OpenedJob[], now = NOW, returnedAt = now, applied: string[] = []) {
  return promptsToShow(list, {
    now,
    returnedAt,
    isApplied: (entry) => applied.includes(entry.jobId),
  }).map((entry) => entry.jobId);
}

describe("which opened jobs to ask about", () => {
  it("asks once the person is back, not while they are still leaving", () => {
    const list = recordOpen([], job("a"), NOW);
    // Back on the tab before the job was opened: still on the way out.
    expect(due(list, NOW + MINUTE, NOW - MINUTE)).toEqual([]);
    expect(due(list, NOW + MINUTE, NOW + MINUTE)).toEqual(["a"]);
    // Before the clock is known nothing is asked.
    expect(due(list, 0, NOW + MINUTE)).toEqual([]);
  });

  it("asks newest first, and keeps one entry per job", () => {
    let list = recordOpen([], job("a"), NOW);
    list = recordOpen(list, job("b"), NOW + MINUTE);
    list = recordOpen(list, job("a"), NOW + 2 * MINUTE);
    expect(list.map((entry) => entry.jobId)).toEqual(["a", "b"]);
    expect(due(list, NOW + 3 * MINUTE)).toEqual(["a", "b"]);
  });

  it("stops asking 7 days after the job was last opened", () => {
    const list = recordOpen([], job("a"), NOW);
    expect(due(list, NOW + ASK_FOR_MS - MINUTE)).toEqual(["a"]);
    expect(due(list, NOW + ASK_FOR_MS)).toEqual([]);
    // Opening it again starts the week over.
    const again = recordOpen(list, job("a"), NOW + 8 * DAY);
    expect(due(again, NOW + 8 * DAY + MINUTE)).toEqual(["a"]);
  });

  it("never asks about a job that is already in Applications", () => {
    let list = recordOpen([], job("a"), NOW);
    list = recordOpen(list, job("b"), NOW);
    expect(due(list, NOW + MINUTE, NOW + MINUTE, ["a"])).toEqual(["b"]);
  });
});

describe("answers", () => {
  it("ends the asking on yes, even if the job is opened again", () => {
    const opened = recordOpen([], job("a"), NOW);
    const answered = answerOpenedJob(opened, "a", "yes", NOW + MINUTE);
    expect(due(answered, NOW + 2 * MINUTE)).toEqual([]);
    const reopened = recordOpen(answered, job("a"), NOW + DAY);
    expect(due(reopened, NOW + DAY + MINUTE)).toEqual([]);
    // Nothing about which job it was is kept once it's done.
    expect(reopened[0]).toMatchObject({ jobId: "a", company: "", title: "", url: "", done: true });
  });

  it("quiets the job on the first 'Not yet' until it is opened again", () => {
    const opened = recordOpen([], job("a"), NOW);
    const once = answerOpenedJob(opened, "a", "not_yet", NOW + MINUTE);
    expect(due(once, NOW + 2 * MINUTE)).toEqual([]);
    expect(due(once, NOW + DAY)).toEqual([]);
    const reopened = recordOpen(once, job("a"), NOW + DAY);
    expect(due(reopened, NOW + DAY + MINUTE)).toEqual(["a"]);
  });

  it("never asks again after the second 'Not yet' on the same job", () => {
    let list = recordOpen([], job("a"), NOW);
    list = answerOpenedJob(list, "a", "not_yet", NOW + MINUTE);
    list = recordOpen(list, job("a"), NOW + DAY);
    list = answerOpenedJob(list, "a", "not_yet", NOW + DAY + MINUTE);
    expect(list[0]).toMatchObject({ notYet: 2, done: true });
    list = recordOpen(list, job("a"), NOW + 2 * DAY);
    expect(due(list, NOW + 2 * DAY + MINUTE)).toEqual([]);
    // Remembered past the week of asking, so "never" outlasts it.
    list = recordOpen(list, job("a"), NOW + 40 * DAY);
    expect(due(list, NOW + 40 * DAY + MINUTE)).toEqual([]);
  });

  it("leaves the list as it was for a job never opened or already done", () => {
    const list = answerOpenedJob(recordOpen([], job("a"), NOW), "a", "yes", NOW);
    expect(answerOpenedJob(list, "a", "not_yet", NOW)).toBe(list);
    expect(answerOpenedJob(list, "missing", "yes", NOW)).toBe(list);
  });
});

describe("keeping the list small", () => {
  it("drops unanswered jobs after their week, and answers after 90 days", () => {
    const fresh = recordOpen([], job("fresh"), NOW);
    const stale = { ...recordOpen([], job("stale"), NOW - ASK_FOR_MS)[0]! };
    const said = {
      ...answerOpenedJob(
        recordOpen([], job("said"), NOW - 30 * DAY),
        "said",
        "not_yet",
        NOW - 30 * DAY,
      )[0]!,
    };
    const old = { ...said, jobId: "old", openedAt: NOW - KEEP_MS };
    expect(pruneOpenedJobs([...fresh, stale, said, old], NOW).map((e) => e.jobId)).toEqual([
      "fresh",
      "said",
    ]);
  });

  it("keeps at most MAX_OPENED_JOBS, the newest", () => {
    let list: readonly OpenedJob[] = [];
    for (let i = 0; i <= MAX_OPENED_JOBS; i++) list = recordOpen(list, job(`j${i}`), NOW + i);
    expect(list).toHaveLength(MAX_OPENED_JOBS);
    expect(list[0]?.jobId).toBe(`j${MAX_OPENED_JOBS}`);
    expect(list.some((entry) => entry.jobId === "j0")).toBe(false);
  });
});

describe("where the question shows", () => {
  it("asks on the card when it's on this page, in the strip when it isn't", () => {
    let list = recordOpen([], job("a"), NOW);
    list = recordOpen(list, job("b"), NOW + 1);
    list = recordOpen(list, job("c"), NOW + 2);
    const asked = promptsToShow(list, {
      now: NOW + MINUTE,
      returnedAt: NOW + MINUTE,
      isApplied: () => false,
    });
    const { onCard, offPage } = splitByPage(asked, ["b", "x"]);
    expect(onCard.map((entry) => entry.jobId)).toEqual(["b"]);
    expect(offPage.map((entry) => entry.jobId)).toEqual(["c", "a"]);
  });

  it("words the strip and what a screen reader hears", () => {
    expect(stripLine(1)).toBe("You opened 1 job. Applied to it?");
    expect(stripLine(3)).toBe("You opened 3 jobs. Applied to any?");
    // Opened in the same moment: the later write comes first.
    const [stripe, vercel] = recordOpen(
      recordOpen([], job("a", "Vercel"), NOW),
      job("b", "Stripe"),
      NOW,
    );
    expect(promptAnnouncement([stripe!], 0)).toBe("Applied to Stripe? Answer on its job card.");
    expect(promptAnnouncement([stripe!, vercel!], 3)).toBe(
      "Applied to the 2 jobs you opened? Answer on their job cards. You opened 3 jobs. Applied to any? It's at the top of the list.",
    );
    expect(promptAnnouncement([], 0)).toBe("");
  });
});

describe("parseOpenedJobs", () => {
  it("keeps saved entries of the right shape and drops the rest", () => {
    const good = recordOpen([], job("a"), NOW)[0]!;
    expect(
      parseOpenedJobs([good, { ...good, jobId: "" }, { ...good, openedAt: "x" }, null, 4]),
    ).toEqual([good]);
    expect(parseOpenedJobs({ jobs: [good] })).toEqual([]);
  });
});
