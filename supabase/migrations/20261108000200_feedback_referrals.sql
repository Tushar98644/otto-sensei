-- Feedback notes, invite links and the extra allowance an invite earns.

-- "Send feedback" (POST /api/feedback). Signed-out notes have no user_id. The owner reads them in
-- the Supabase table editor; nothing in the app lists them.
create table public.feedback (
  id uuid primary key,
  user_id uuid references public.users (id) on delete cascade,
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(message) between 1 and 2000),
  -- The in-app path the note was sent from, never a full URL: a stored link is one someone might click.
  page_path text check (page_path is null or (char_length(page_path) <= 300 and (page_path = '/' or page_path ~ '^/[^/\\]'))),
  created_at bigint not null
);
create index feedback_created_idx on public.feedback (created_at desc);
-- Account deletion cascades through this, and a person's own notes are found by it.
create index feedback_user_idx on public.feedback (user_id) where user_id is not null;

-- Each account's invite code, made the first time its invite card is opened.
create table public.referral_codes (
  user_id uuid primary key references public.users (id) on delete cascade,
  -- 8 characters with no 0, 1, i, l or o, so it survives being read aloud or typed from a screenshot.
  code text not null unique check (code ~ '^[a-hjkmnp-z2-9]{8}$'),
  -- Device cookies (otto_did) the owner opened the invite card from, newest last. A "friend" who
  -- signs up from one of them is the owner again, so that invite earns nothing.
  device_ids text[] not null default '{}' check (cardinality(device_ids) <= 10),
  created_at bigint not null
);

-- One row per account that signed up through an invite: nobody is invited twice.
create table public.referrals (
  referred_id uuid primary key references public.users (id) on delete cascade,
  referrer_id uuid not null references public.users (id) on delete cascade,
  -- pending: signed up, no resume checked yet. rewarded: both got the bonus. capped: the friend
  -- got it, the inviter had already earned the most invites pay for. blocked: same person or
  -- device as the inviter, so nobody got anything.
  status text not null default 'pending' check (status in ('pending', 'rewarded', 'capped', 'blocked')),
  blocked_reason text check (blocked_reason in ('same_device', 'same_person')),
  -- The device cookie the friend signed up from, so one browser can't stand in for many friends.
  device_id text,
  -- "YYYY-MM" (UTC) the bonus was added to, and when.
  rewarded_period text,
  rewarded_at bigint,
  created_at bigint not null,
  check (referred_id <> referrer_id),
  check ((status = 'blocked') = (blocked_reason is not null))
);
-- The invite card's counts and the reward cap read by status.
create index referrals_referrer_status_idx on public.referrals (referrer_id, status);
create index referrals_referrer_device_idx on public.referrals (referrer_id, device_id)
  where device_id is not null;

alter table public.feedback enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;

-- Extra units for this (user, feature, month) on top of the plan's limit, from invites. On the same
-- row as the count, so the allowance check in src/lib/usage.ts stays one statement on one row.
alter table public.usage add column bonus integer not null default 0 check (bonus >= 0);
