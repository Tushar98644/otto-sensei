# Job matching

How the Jobs tab picks and orders openings for a resume. Sources and counts are in job-sources.md.

The shape follows what large job sites publish (LinkedIn's _Learning to Retrieve for Job Matching_, arXiv 2402.13435, and _Talent Search and Recommendation Systems at LinkedIn_, arXiv 1809.06481; CareerBuilder's embedding recommender, arXiv 2107.00221), cut to our size and a $0 budget: standardized occupations, hard filters, retrieval then ranking, title embeddings for meaning, and an explainable linear score.

## The role

"Looking for" names the role: the person's pick, else the latest resume title that names a kind of role (`roles.ts`: the title's first part that names one, its head noun winning, so "Software Engineer, Compliance" is engineering), else a clear lead in the skills ("Any engineering role"), else Any role. `withOccupation` (`rank.ts`) reads the role's O*NET or ESCO occupation from its title (`occupations/`).

## Retrieval: the role gate

A job is shown only when it is the person's kind of work (`role-gate.ts`), however many skills it shares:

- **The role's occupation and its group.** A role in one of the groups below may be matched with every occupation in its groups; any other role with its own detailed occupation and O*NET's closest occupations to it.
  - Software: software developers (backend, frontend, full-stack, mobile, embedded), programmers, QA and SDET, web developers, DevOps, SRE and systems engineers, security engineers, data and database engineers, network architects, research scientists, ML engineers, and engineering managers. Not technical support, customer support, sales engineering, marketing or finance.
  - Data and ML; design; product; marketing; sales; support; legal (with paralegals and compliance); accounting and finance; nursing.
- **A job whose occupation the rules can't read** takes its title vector's nearest occupation when that is at least 0.7 similar (below), else is shown when its kind of role is the person's ("Platform Engineering" for a software engineer).
- **A role named only by its kind** ("Any engineering role") shows jobs of that kind; **Any role** lets the skills decide, as before.
- **Internships** are shown only when the person is looking for one (their level is Internship, picked or read from a latest title like "Software Engineer Intern").

The hard filters stay: open, not a general application, posted within 90 days, in a place the person chose or naming none, remote when asked. The gate runs in the match index query (`indexedPool`), so the count of matches is of allowed jobs only, and again on every ranked job (`rankJobs`), so the fallback path that ranks from `jobs` keeps it too. The query keeps the best 300 by weighted skill overlap plus kind of role.

## Title vectors

**Model.** [TechWolf/JobBERT-v2](https://huggingface.co/TechWolf/JobBERT-v2) (MIT), trained on 5.6 million job titles paired with their ESCO skills, so titles that need the same skills land close ("Software Engineer" is 0.63 from "Backend Developer", 0.45 from "Technical Support Engineer", 0.22 from "Legal Counsel"). We run its int8 ONNX build ([onnx-community/JobBERT-v2-ONNX](https://huggingface.co/onnx-community/JobBERT-v2-ONNX), 110 MB) with onnxruntime on the CPU: mean pooling, then the model's own "anchor" dense layer for titles (768 to 1,024, tanh). Both are pinned by revision in `scripts/title-vectors.py`.

**Never on a request.** The site runs no model and has no native dependency. The daily workflow (`.github/workflows/daily.yml`) embeds titles right after the day's job read, on GitHub's runner: it asks `/api/cron/title-vectors` for the titles still waiting (CRON_SECRET, no database credentials), embeds them, sends the vectors back 600 at a time, and its last call rebuilds the match index. A title is embedded once however many jobs carry it (`titleVectorKey`), and only new titles wait. A role a person types into "Looking for" is queued the same way when they save it, and is read by its occupation until its own vector arrives.

**Size.** A fixed basis (`scripts/title-vectors.basis`, fitted once on occupation names and 20,000 job titles) keeps 256 of the 1,024 dimensions, stored as int8: **256 bytes a title**. Against the full vectors the stored ones keep similarity at Pearson r = 0.999 and 96% of each title's ten nearest titles. With its key and three nearest occupations a `title_vectors` row is about 440 bytes, about 30 MB with its index for the 57,865 titles of the 90k-row copy; `job_match` gains the title key (about 43 bytes an opening, 3 MB). Keys no open job carries and nobody chose for 30 days are dropped at the rebuild. At the 150,000-row cap that is about 55 MB more of Supabase Free's 500 MB.

**Speed.** About 7 s per 1,000 titles on a laptop CPU (4 threads, with other work running). A day adds a few thousand new titles; the first fill of about 58,000 takes two daily runs at 15 rounds of 2,000.

**Occupations.** `src/lib/job-feed/occupations/vectors.json` holds one vector per occupation (its names twice, Otto's own names for it and its shortest aliases), so a person's role whose title has no stored vector is read through its occupation. The embedding step also stores each title's three nearest occupations.

## Ranking

For the 300, the person's role becomes a vector (their role's stored title vector, else its occupation's, blended with earlier titles at 0.3), and each job's title vector gives its exact similarity to it. That similarity sets the job's kind of role: the person's own at 0.65 or more, none at 0.45 or less, straight in between; a job the gate let in counts at least as a neighbouring kind, so it is ordered, not dropped. The label (strong, good, stretch) comes from that and the skill coverage, as before, and the order is label first, then this score:

| Part    | Weight | Value (0 to 1)                                                                                                                    |
| ------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Role    | 0.45   | The job's kind of role as above (the rules' when it has no vector), 10% more when its title names the role asked for              |
| Skills  | 0.30   | Half the share of the post's skills found, each weighted by rarity (IDF), half the weighted count found, full at 6                |
| Level   | 0.10   | 1 at the person's level, 0.85 one up, 0.9 one down, 0.5 further; times 0.9 or 0.6 when the occupation usually needs more training |
| Recency | 0.10   | Halves every 30 days since posted                                                                                                 |
| Place   | 0.05   | 1 in a place the person chose, 0.6 when the post names none                                                                       |

Then at most 3 openings from one company in each 20, and jobs two or more levels away after all nearer ones. When a title differs from the person's but means the same work (0.55 or more), the card's "why" starts with it: "Role match: Backend Developer ≈ your Software Engineer."

Required and nice-to-have skills aren't told apart yet: posts are read once at ingest and their text isn't kept, so the split needs a new column filled as boards are read again.

## Evaluation

`scripts/match-eval/personas.ts` holds 11 personas (junior and senior software engineer, AI engineer, data analyst, product manager, UI/UX designer, registered nurse, accountant, marketing manager, account executive, lawyer), each matched in the US, the UK, Australia, Brazil and India (55 lists). A job's label comes from its title alone, by rules written for each persona, so it depends on neither matcher: 2 the persona's own role, 1 a neighbouring role, 0 off-role. The labels of every title in a top 30 are kept in `scripts/match-eval/labels.json`; a sample of each persona's was checked by hand and the rules corrected where they were wrong either way. `OTTO_PGLITE_DIR=<copy> bun scripts/match-eval.ts personas --as <name>` ranks the first 15 pages for each, and `persona-report` prints the table.

On the 89,624-row copy of 2026-11-22, averaged over the five places (P@k: share of the top k that are the persona's own role; off@10: share of the top 10 labelled 0; rel@300: own or neighbouring roles in the first 300, summed over places). Before is the role-guess fix alone, Gate adds the role gate, Vectors adds the title vectors and the linear score:

| Persona                    | Before P@10 | P@30    | Off@10 | Rel@300   | Gate P@10 | P@30    | Off@10 | Rel@300   | Vectors P@10 | P@30    | Off@10 | Rel@300   |
| -------------------------- | ----------- | ------- | ------ | --------- | --------- | ------- | ------ | --------- | ------------ | ------- | ------ | --------- |
| Software engineer (junior) | 72%         | 69%     | 18%    | 1,065     | 82%       | 74%     | 8%     | 1,310     | 98%          | 90%     | 0%     | 1,310     |
| Software engineer (senior) | 86%         | 79%     | 0%     | 1,371     | 92%       | 82%     | 0%     | 1,452     | 96%          | 98%     | 0%     | 1,453     |
| AI engineer                | 86%         | 69%     | 4%     | 831       | 86%       | 70%     | 0%     | 1,049     | 96%          | 83%     | 0%     | 1,045     |
| Data analyst               | 60%         | 47%     | 6%     | 689       | 70%       | 57%     | 2%     | 727       | 82%          | 56%     | 2%     | 707       |
| Product manager            | 98%         | 89%     | 2%     | 515       | 98%       | 97%     | 2%     | 819       | 100%         | 99%     | 0%     | 819       |
| UI/UX designer             | 92%         | 68%     | 2%     | 416       | 92%       | 84%     | 2%     | 459       | 92%          | 85%     | 0%     | 456       |
| Registered nurse           | 82%         | 65%     | 6%     | 464       | 82%       | 91%     | 6%     | 464       | 88%          | 93%     | 2%     | 465       |
| Accountant                 | 68%         | 58%     | 4%     | 815       | 70%       | 57%     | 6%     | 757       | 94%          | 79%     | 0%     | 751       |
| Marketing manager          | 88%         | 82%     | 2%     | 806       | 90%       | 80%     | 0%     | 839       | 98%          | 97%     | 0%     | 836       |
| Account executive          | 92%         | 95%     | 8%     | 1,108     | 98%       | 97%     | 2%     | 1,353     | 100%         | 100%    | 0%     | 1,351     |
| Lawyer                     | 52%         | 50%     | 6%     | 565       | 54%       | 55%     | 8%     | 550       | 84%          | 78%     | 4%     | 549       |
| **All**                    | **80%**     | **70%** | **5%** | **8,645** | **83%**   | **77%** | **3%** | **9,779** | **93%**      | **87%** | **1%** | **9,742** |

- No persona has more than 4% off-role jobs in its top 10 (the target was under 10% for each), and no persona loses more than 8% of its relevant jobs (accountant, whose finance neighbours outside its group go); together they gain 13%.
- Off-role jobs anywhere in the first 300 fall from 9-58% to 1-30% by persona (UI/UX designer 40% to 1%, nurse 33% to 1%, product manager 58% to 8%), and the persona's own role takes the room: 5,974 own-role jobs in the first 300 before, 6,928 after.
- What's left off-role is mostly neighbours the labels count as off (a QA engineer for a software engineer, a compliance analyst for a lawyer) and, in small markets, US posts that name no place. JobBERT-v2 reads English; Portuguese titles fall back to the rules.
- An earlier try that also read titles in the match query through 2,048 k-means kinds of title (to retrieve by meaning before the gate existed) reached 91% P@10 but lost 11-23% of the relevant jobs of the designer, accountant, marketer and lawyer, because those kinds are too coarse to stand for a title; the gate replaced it.

**Speed.** A first page takes 98 ms at the median (131 ms at p90) with the gate on PGlite, against 113-116 ms before, and 136-143 ms with the vectors (their reads and each job's title work; the run-to-run spread on a busy laptop was about 40 ms).

**More US boards (2026-11-23).** With the 322 boards added for the US (job-sources.md), the same 55 lists on a copy with 102,015 openings instead of 67,116, both copies with every title embedded and run back to back at the same moment: P@10 514 of 550 own-role jobs against 515 (93.5% and 93.6%), US lists 96.4% against 95.5% and Australia 93.6% against 91.8%, India 90.9% against 94.5% (four neighbouring or off-role posts of new Workday employers' India offices), P@30 88% against 87%, off@10 1% both, and 10,122 relevant jobs in the first 300 against 9,733. That counts Shield AI's "Engineer I, Software - New Grad" as the junior software engineer's own role: the label rules read "Engineer I, Software" as a neighbour until they learned that word order (`SOFTWARE_ANYWHERE` in `personas.ts`), which left it at 513. Shield AI's posts that name no place are now read as US (`place` on its seed), so they no longer show in other countries' lists. A first page took 278 ms at the median (371 ms at p90) against 242 ms (313 ms) on a busier laptop than the 186 ms of the first comparison: the match index query reads about half as many openings again.

## Feedback

Every impression is logged per job and match request in `match_events` with its position, label, the variant and a hash of the resume's facts, and now the five score parts above (`features`, one byte each). Opens, saves, tailors, applies, "not a fit" (with the reason) and the asked-applied answers are logged against the same request. That is enough to fit the weights later the way LinkedIn does (a logistic model per kind of persona, then GLMix or gradient-boosted trees): impressions are the rows, the five parts the features, and an apply (or a save, then an open, weighted less) the label. Fit it on a few weeks of events, compare it with these hand weights on the next weeks' clicks as a second variant, and switch only if it wins. Nothing is trained yet.
