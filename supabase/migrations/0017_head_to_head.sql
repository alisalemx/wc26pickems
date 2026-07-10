-- 0017_head_to_head.sql
-- Static "head to head" history between two national teams — all their
-- meetings (competitive + friendly) in the last 15 years, sourced offline the
-- same way team_form's pre-tournament data is (no free API carries this).
-- The Compare modal shows it for knockout matches only; that gate lives in
-- the client (TeamInfoDialog), not in the data.
--
-- Populated by the service role (which bypasses RLS). Publicly readable so the
-- Compare modal's Head to head section renders for logged-out visitors too,
-- exactly like the public `matches`/`team_form` grants.

create table public.head_to_head (
  pair_key text primary key,          -- two canonical football-data TLAs, sorted
                                       -- alphabetically and joined by "-", e.g. "ARG-SUI"
  meetings jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table public.head_to_head enable row level security;

-- Read-only for everyone. No insert/update/delete policies exist, so only the
-- service role can write — the same shape used for `team_form`.
create policy "head_to_head readable by anyone"
  on public.head_to_head for select
  using (true);

grant select on public.head_to_head to anon, authenticated;
