-- Tracking applications from email (src/lib/inbound). Each account picks a handle; its address is
-- otto+<handle>@track.ottosensei.com (or <handle>@<short domain>). A handle that's changed or turned
-- off still takes mail for 14 days and is held from everyone else for 90, so nobody can take a
-- recent one; it outlives a deleted account for the same reason, so the user id is set to null then.
create table public.inbound_handles (
  handle text primary key check (char_length(handle) between 3 and 30 and handle ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'),
  user_id uuid references public.users (id) on delete set null,
  created_at bigint not null,
  -- Null while it's the account's handle.
  retired_at bigint,
  routes_until bigint
);

alter table public.inbound_handles enable row level security;

create unique index inbound_handles_current_idx on public.inbound_handles (user_id) where retired_at is null;
create index inbound_handles_user_idx on public.inbound_handles (user_id);
create index inbound_handles_retired_idx on public.inbound_handles (retired_at) where retired_at is not null;

-- Each account's setup: Gmail's forwarding confirmation, shown in Otto so nobody has to read it
-- elsewhere, and the Gmail addresses the person confirmed as theirs.
create table public.inbound_addresses (
  user_id uuid primary key references public.users (id) on delete cascade,
  created_at bigint not null,
  confirm_code text check (char_length(confirm_code) <= 20),
  confirm_url text check (char_length(confirm_url) <= 2048),
  confirm_source text check (char_length(confirm_source) <= 320),
  confirm_at bigint,
  confirmed_at bigint,
  sources text[] not null default '{}' check (cardinality(sources) <= 5),
  test_at bigint,
  last_email_at bigint
);

alter table public.inbound_addresses enable row level security;

-- What Otto read in each job email and what it changed or proposes, so every change can be shown,
-- checked and undone. Never the email itself: the sender's domain, the subject and the facts read.
create table public.inbound_emails (
  id uuid primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  -- SHA-256 of the Message-ID (or of the sender, subject and date), so a redelivery changes nothing twice.
  message_key text not null check (char_length(message_key) = 43),
  sender text not null default '' check (char_length(sender) <= 253),
  subject text not null default '' check (char_length(subject) <= 300),
  kind text not null check (kind in ('applied', 'rejected', 'interview', 'assessment', 'offer', 'unknown')),
  system text check (char_length(system) <= 40),
  company text not null default '' check (char_length(company) <= 200),
  role text not null default '' check (char_length(role) <= 200),
  job_url text not null default '' check (char_length(job_url) <= 2048),
  sent_at bigint,
  event_at bigint,
  event_text text not null default '' check (char_length(event_text) <= 120),
  -- Why it was applied without asking: the person's own Gmail, a signed hiring sender, or their press.
  trust text check (trust in ('source', 'sender', 'you')),
  -- Not a foreign key: deleting a card never has to scan this table, and the row just loses its Undo.
  application_id uuid,
  change text not null default 'none' check (change in ('created', 'moved', 'dated', 'none', 'pending')),
  from_status text,
  to_status text,
  -- The card's fields before the change, for Undo.
  before jsonb,
  -- The card's updated_at right after the change: Undo only runs while nobody has changed it since.
  changed_at bigint,
  received_at bigint not null,
  undone_at bigint,
  dismissed_at bigint,
  unique (user_id, message_key)
);

alter table public.inbound_emails enable row level security;

create index inbound_emails_user_received_idx on public.inbound_emails (user_id, received_at desc);
create index inbound_emails_received_idx on public.inbound_emails (received_at);
