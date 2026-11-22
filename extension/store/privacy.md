# Chrome Web Store privacy tab (draft)

## Single purpose

Otto for Chrome shows how the person's resume matches the job post they are reading, and whether they can take the job, and lets them save that post to their Otto Sensei account.

## Permissions

| Permission                                                                    | Why it's needed                                                                                                                                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `storage`                                                                     | Keeps the account's connection key and the match data (resume text without contact details, work profile, saved job keys) on the device, so a job post is checked with no network request. |
| `activeTab`                                                                   | When the person presses the toolbar button on a site Otto doesn't support, lets Otto read that one tab, that one time.                                                                     |
| `scripting`                                                                   | With `activeTab`, injects the badge into the tab the person pressed the button on.                                                                                                         |
| Host: `https://www.linkedin.com/jobs/*`                                       | Reads LinkedIn job posts (job pages and the job search pane only).                                                                                                                         |
| Host: `https://*.naukri.com/job-listings-*`                                   | Reads Naukri job listings.                                                                                                                                                                 |
| Host: `https://*.indeed.com/*`                                                | Reads Indeed job posts and the search page's job pane; Indeed serves them on country domains.                                                                                              |
| Host: `boards.greenhouse.io`, `job-boards.greenhouse.io` (and their EU hosts) | Reads Greenhouse job boards, including the frame company sites embed.                                                                                                                      |
| Host: `jobs.lever.co`, `jobs.eu.lever.co`                                     | Reads Lever job posts.                                                                                                                                                                     |
| Host: `jobs.ashbyhq.com`                                                      | Reads Ashby job posts.                                                                                                                                                                     |
| Host: `https://*.myworkdayjobs.com/*`                                         | Reads Workday job posts; each company has its own subdomain.                                                                                                                               |
| Host: `jobs.smartrecruiters.com`, `apply.workable.com`                        | Reads SmartRecruiters and Workable job posts.                                                                                                                                              |
| Host: `https://www.ottosensei.com/*`                                          | Connects to the person's Otto account, fetches their match data and saves jobs.                                                                                                            |

**Remote code:** none. Every script ships in the package.

## Data use

| Category                                                                                     | Collected?      | What and why                                                                                                                        |
| -------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Personally identifiable information                                                          | Yes             | The connected account's email, sent by Otto's server and shown in the extension.                                                    |
| Authentication information                                                                   | Yes             | A random key for the person's Otto account, kept on the device; Otto's server keeps only its SHA-256.                               |
| Website content                                                                              | Yes, on request | When the person presses Save, Tailor or Letter: the job post's link, title, company, location and text, sent to their Otto account. |
| Health, financial and payment, personal communications, location, web history, user activity | No              | Otto reads job posts only, and checking one sends nothing.                                                                          |

**Certifications:** the data isn't sold to third parties, isn't used or transferred for purposes unrelated to the single purpose, and isn't used or transferred to determine creditworthiness or for lending.
