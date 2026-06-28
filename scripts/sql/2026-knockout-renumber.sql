-- One-time data correction: renumber knockout matches to official FIFA numbers.
--
-- Why: the API seed numbered knockout fixtures by kickoff time, but FIFA's
-- knockout match numbers are NOT chronological. The bracket linkage (FEEDERS in
-- src/components/Bracket.tsx) is keyed by official number, so the wrong R32
-- winners were being paired in the Round of 16. The code fix
-- (KNOCKOUT_FD_ID_TO_NUMBER in scripts/fd-shared.ts) prevents this on future
-- seeds; this script corrects the rows already in the database.
--
-- Mapping source: openfootball/worldcup 2026--usa/cup_finals.txt, cross-checked
-- against live football-data fixtures. Each whole row is moved by id, so teams,
-- kickoff, fd_id and status travel together; the 4 existing knockout predictions
-- move with their teams. All R32 are stage-multiplier x1, so scoring is
-- unaffected by the move. Idempotent-ish: the WHERE clauses only match the
-- temp/official ranges, so re-running on already-correct data is a no-op.
--
-- Run against the project DB (Supabase SQL editor or psql). Safe in one tx.

BEGIN;

-- Drop FK so matches.id and predictions.match_id can be renumbered together
-- (the FK is ON DELETE CASCADE but NO ACTION on update).
ALTER TABLE predictions DROP CONSTRAINT predictions_match_id_fkey;

-- Phase 1 — shift all knockout rows (and their predictions) into a temp range
UPDATE matches     SET id       = id       + 1000 WHERE id       BETWEEN 73 AND 104;
UPDATE predictions SET match_id = match_id + 1000 WHERE match_id BETWEEN 73 AND 104;

-- Phase 2 — temp ids -> official FIFA match numbers.
-- R32 permutation (by teams) + R16 89<->90 swap (by kickoff/fd_id); 91-104 unchanged.
UPDATE matches SET id = CASE id
  WHEN 1073 THEN 73  WHEN 1074 THEN 76  WHEN 1075 THEN 74  WHEN 1076 THEN 75
  WHEN 1077 THEN 78  WHEN 1078 THEN 77  WHEN 1079 THEN 79  WHEN 1080 THEN 80
  WHEN 1081 THEN 82  WHEN 1082 THEN 81  WHEN 1083 THEN 84  WHEN 1084 THEN 83
  WHEN 1085 THEN 85  WHEN 1086 THEN 88  WHEN 1087 THEN 86  WHEN 1088 THEN 87
  WHEN 1089 THEN 90  WHEN 1090 THEN 89
  ELSE id - 1000 END
WHERE id BETWEEN 1073 AND 1104;

UPDATE predictions SET match_id = CASE match_id
  WHEN 1073 THEN 73  WHEN 1074 THEN 76  WHEN 1076 THEN 75  WHEN 1082 THEN 81
  ELSE match_id - 1000 END
WHERE match_id BETWEEN 1073 AND 1104;

-- Restore FK
ALTER TABLE predictions
  ADD CONSTRAINT predictions_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

COMMIT;

-- Verification (run after COMMIT) — expect these exact R32 pairings:
--   73 RSA/CAN  74 GER/PAR  75 NED/MAR  76 BRA/JPN  77 FRA/SWE  78 CIV/NOR
--   79 MEX/ECU  80 ENG/COD  81 USA/BIH  82 BEL/SEN  83 POR/CRO  84 ESP/AUT
--   85 SUI/ALG  86 ARG/CPV  87 COL/GHA  88 AUS/EGY
-- SELECT id, home_code, away_code FROM matches WHERE id BETWEEN 73 AND 88 ORDER BY id;
