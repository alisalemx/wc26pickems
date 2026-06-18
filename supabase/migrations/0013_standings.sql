-- 0013_standings.sql
-- Official group standings, synced from football-data.org's /standings endpoint.
--
-- We can compute a group's points / goal difference / goals / head-to-head from
-- our own matches table, but the *final ordering* once teams are still level
-- depends on FIFA's fair-play (disciplinary) tiebreaker and then a drawing of
-- lots. We store no card data, so we can't reproduce that order. football-data's
-- standings endpoint already applies the full FIFA tiebreaker chain, so we store
-- its result and render that order verbatim.
--
-- One row per team per group, written only by the service role (the sync
-- function) and publicly readable like `matches` (0004) and `team_form` (0011)
-- so the Tournament > Groups tab renders for logged-out visitors.
--
-- NB: the standings endpoint counts in-progress matches (a live result shows
-- here before the matches feed flips to FINISHED) and labels a few teams with a
-- different TLA than the matches feed (e.g. Uruguay URU vs URY — flags.ts maps
-- both). We key on football-data's stable team id to sidestep the TLA mismatch.

create table public.standings (
  fd_team_id int primary key,         -- football-data team id (stable across endpoints)
  group_name text not null,           -- group letter A..L, joins to matches.group_name
  position int not null,              -- 1..4, football-data's official rank (incl. fair-play & lots)
  team_code text,                     -- football-data TLA, for flags (URU/URY both map in flags.ts)
  team_name text,
  played int not null default 0,
  won int not null default 0,
  drawn int not null default 0,
  lost int not null default 0,
  gf int not null default 0,
  ga int not null default 0,
  points int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.standings enable row level security;

-- Read-only for everyone; no insert/update/delete policies exist, so only the
-- service role can write — the same shape used for `matches` and `team_form`.
create policy "standings readable by anyone"
  on public.standings for select
  using (true);

grant select on public.standings to anon, authenticated;
