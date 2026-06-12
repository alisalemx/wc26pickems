-- Admin result overrides must survive the 10-minute sync. When an admin
-- saves a result from /admin the row is marked result_locked; the sync
-- function (service role) then skips the result fields (status, scores,
-- pens, duration) for that row but keeps reconciling fixture metadata
-- (teams, kickoff, fd_id). Unlocking re-opens the row to the API.
--
-- No new grants/policies needed: the "admin result override" UPDATE policy
-- on matches already gates writes to admins, and matches never had
-- column-level grant narrowing.
alter table public.matches
  add column result_locked boolean not null default false;
