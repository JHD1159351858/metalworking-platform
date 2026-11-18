begin;

-- Administrators bind verified Chaoxing identities to existing course accounts.
create table public.metalwork_chaoxing_accounts (
  fid text not null check (char_length(fid) between 1 and 256 and fid = btrim(fid) and fid !~ '[[:cntrl:]]'),
  uid text not null check (char_length(uid) between 1 and 256 and uid = btrim(uid) and uid !~ '[[:cntrl:]]'),
  user_id uuid not null unique references public.metalwork_profiles(user_id) on delete cascade,
  primary key (fid, uid)
);

-- Only the login function can create and consume browser proof challenges.
create table public.metalwork_chaoxing_login_flows (
  id uuid primary key,
  challenge text not null check (challenge ~ '^[0-9a-f]{64}$'),
  origin text not null check (char_length(origin) between 1 and 2048 and origin = btrim(origin) and origin !~ '[[:cntrl:]]'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '5 minutes'
);

create index metalwork_chaoxing_login_flows_expiry on public.metalwork_chaoxing_login_flows(expires_at);

alter table public.metalwork_chaoxing_accounts enable row level security;
alter table public.metalwork_chaoxing_login_flows enable row level security;

revoke all on table public.metalwork_chaoxing_accounts, public.metalwork_chaoxing_login_flows
  from public, anon, authenticated, service_role;

grant select on public.metalwork_chaoxing_accounts to service_role;
grant select, delete on public.metalwork_chaoxing_login_flows to service_role;
grant insert (id, challenge, origin) on public.metalwork_chaoxing_login_flows to service_role;

commit;
