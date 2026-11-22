# Job matching

How the Jobs tab picks and orders openings for a resume. Sources and counts are in JOB-SOURCES.md.

## The role

"Looking for" names the role: the person's pick, else the latest resume title that names a kind of role (`roles.ts`: the title's first part that names one, its head noun winning, so "Software Engineer, Compliance" is engineering), else a clear lead in the skills ("Any engineering role"), else Any role. `withOccupation` (`rank.ts`) reads the role's O*NET or ESCO occupation from its title (`occupations/`).

## The role gate

A job is shown only when it is the person's kind of work (`role-gate.ts`), however many skills it shares:

- **The role's occupation and its group.** A role in one of the groups below may be matched with every occupation in its groups; any other role with its own detailed occupation and O*NET's closest occupations to it.
  - Software: software developers (backend, frontend, full-stack, mobile, embedded), programmers, QA and SDET, web developers, DevOps, SRE and systems engineers, security engineers, data and database engineers, network architects, research scientists, ML engineers, and engineering managers. Not technical support, customer support, sales engineering, marketing or finance.
  - Data and ML; design; product; marketing; sales; support; legal (with paralegals and compliance); accounting and finance; nursing.
- **A job whose occupation the rules can't read** is shown when its kind of role is the person's ("Platform Engineering" for a software engineer).
- **A role named only by its kind** ("Any engineering role") shows jobs of that kind; **Any role** lets the skills decide, as before.
- **Internships** are shown only when the person is looking for one (their level is Internship, picked or read from a latest title like "Software Engineer Intern").

Seniority stays a soft order: jobs a level away are nudged down and jobs two or more levels away follow every nearer one.

The gate runs in the match index query (`indexedPool`), so the count of matches is of allowed jobs only, and again on every ranked job (`rankJobs`), so the fallback path that ranks from `jobs` keeps it too.

## Evaluation

`scripts/match-eval/personas.ts` holds 11 personas (junior and senior software engineer, AI engineer, data analyst, product manager, UI/UX designer, registered nurse, accountant, marketing manager, account executive, lawyer), each matched in the US, the UK, Australia, Brazil and India (55 lists). A job's label comes from its title alone, by rules written for each persona, so it doesn't depend on either matcher: 2 the persona's own role, 1 a neighbouring role, 0 off-role. The labels of every title in a top 30 are kept in `scripts/match-eval/labels.json`; a sample of each persona's was checked by hand and the rules corrected where they were wrong both ways. `OTTO_PGLITE_DIR=<copy> bun scripts/match-eval.ts personas --as <name>` ranks the first 15 pages for each, and `persona-report` prints the table.

On the 89,624-row copy of 2026-11-22, averaged over the five places (P@k: share of the top k that are the persona's own role; off-role@10: share of the top 10 labelled 0; relevant@300: own or neighbouring roles in the first 300, summed over places):

| Persona                    | Before P@10 | P@30    | Off-role@10 | Relevant@300 | Gate P@10 | P@30    | Off-role@10 | Relevant@300 |
| -------------------------- | ----------- | ------- | ----------- | ------------ | --------- | ------- | ----------- | ------------ |
| Software engineer (junior) | 72%         | 69%     | 18%         | 1,065        | 82%       | 74%     | 8%          | 1,310        |
| Software engineer (senior) | 86%         | 79%     | 0%          | 1,371        | 92%       | 82%     | 0%          | 1,452        |
| AI engineer                | 86%         | 69%     | 4%          | 831          | 86%       | 70%     | 0%          | 1,049        |
| Data analyst               | 60%         | 47%     | 6%          | 689          | 70%       | 57%     | 2%          | 727          |
| Product manager            | 98%         | 89%     | 2%          | 515          | 98%       | 97%     | 2%          | 819          |
| UI/UX designer             | 92%         | 68%     | 2%          | 416          | 92%       | 84%     | 2%          | 459          |
| Registered nurse           | 82%         | 65%     | 6%          | 464          | 82%       | 91%     | 6%          | 464          |
| Accountant                 | 68%         | 58%     | 4%          | 815          | 70%       | 57%     | 6%          | 757          |
| Marketing manager          | 88%         | 82%     | 2%          | 806          | 90%       | 80%     | 0%          | 839          |
| Account executive          | 92%         | 95%     | 8%          | 1,108        | 98%       | 97%     | 2%          | 1,353        |
| Lawyer                     | 52%         | 50%     | 6%          | 565          | 54%       | 55%     | 8%          | 550          |
| **All**                    | **80%**     | **70%** | **5%**      | **8,645**    | **83%**   | **77%** | **3%**      | **9,779**    |

Off-role jobs anywhere in the first 300 fall from 9-58% to 1-30% by persona (UI/UX designer 40% to 1%, nurse 33% to 1%, product manager 58% to 8%), because the room the gate frees goes to the persona's own role: own-role jobs in the first 300 rise from 5,974 to 6,915. No persona loses more than 7% of its relevant jobs (accountant, whose finance neighbours outside the group go). What's left off-role in a top 10 is mostly neighbours the labels count as off (a QA engineer for a software engineer, a compliance analyst for a lawyer) and, in small markets, US posts that name no place.

A first page takes 98 ms at the median (131 ms at p90) on PGlite, against 113-116 ms before: the gate leaves the query fewer rows to score.
