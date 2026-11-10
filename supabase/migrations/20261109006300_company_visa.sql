-- Companies on public visa registers (JOB-SOURCES.md, "Visa registers"), shown on job cards as a
-- plain fact ("Listed as a UK visa sponsor") and read by the work-rights check. Filled by
-- scripts/visa-registers.ts from the UK Register of Licensed Sponsors and the USCIS H-1B Employer
-- Data Hub, only for company names checked against the register by hand (visa-matches.ts).

create table public.company_visa (
  -- The company as job posts name it, folded (companyKey in src/lib/job-feed/visa.ts).
  company_key text primary key check (char_length(company_key) between 1 and 200),
  -- The organisation's name on the UK register, while it is listed for Skilled Worker.
  uk_name text,
  -- The latest US fiscal year with an approved H-1B petition, and the employer name it is under.
  h1b_year smallint check (h1b_year between 2009 and 2100),
  h1b_approvals integer check (h1b_approvals >= 0),
  us_name text,
  checked_at bigint not null
);

alter table public.company_visa enable row level security;
