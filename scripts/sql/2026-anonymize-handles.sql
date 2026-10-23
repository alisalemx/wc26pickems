-- One-time data change: give every player a new, non-identifying handle.
--
-- Why: the site is going public, read-only (0019_public_read.sql opens the
-- leaderboard, player pages, and revealed picks to logged-out visitors). The
-- handles were picked by the players and several are real names, so every
-- profile, the admin's included, gets a pun on a real footballer instead,
-- assigned at random so the new handle says nothing about the person.
--
-- The old handles are deliberately not recorded anywhere in this repo (it's
-- public). This file holds only the new handles, keyed by profile id, and the
-- public leaderboard exposes both of those anyway. username_chosen is left as
-- it was, so a returning player isn't sent back to /welcome to pick again.
--
-- None of the new handles matches an old one, so the per-row unique index
-- check can't trip mid-update. Run before 0019. Applied 2026-10-23; it sets
-- fixed values, so re-running it would undo any handle a player has changed
-- since, and it should not need re-running.

BEGIN;

UPDATE profiles p
SET username = m.username
FROM (VALUES
  ('d913bf1b-6adb-46e1-a049-05649857ff9d'::uuid, 'ibra_cadabra'),
  ('7847b71a-53f7-4214-8161-0cd7e690d0a5'::uuid, 'alisson_wonderland'),
  ('dacc550b-a574-4d37-9982-7dc77badf6bb'::uuid, 'pedri_dish'),
  ('9b8ca2a3-7976-41a1-b908-d0e225d2ec76'::uuid, 'messi_kitchen'),
  ('e226b03d-1747-4c70-a588-0692490bf7e8'::uuid, 'vardy_party'),
  ('b50b224f-fec7-4581-9695-76bdde9a4535'::uuid, 'kane_and_able'),
  ('65a8c1bd-5868-4e4b-93c0-bff41f34bed7'::uuid, 'mbappuccino'),
  ('2fe5e9cc-27c7-473b-82b2-79010cbf966c'::uuid, 'kante_believe_it'),
  ('cb2df575-3795-445a-8585-dd44bf02811b'::uuid, 'zizou_roulette'),
  ('2c034cd2-ad6a-4e11-bb5f-6f655465e86c'::uuid, 'luka_at_me'),
  ('48d9169f-5bec-4757-a232-12193534afaa'::uuid, 'vini_vidi_vici'),
  ('d92f7788-e7de-4084-be9b-36a65fb35879'::uuid, 'cr7_siuuu'),
  ('6c0548fc-4eb2-4a64-9183-8115c06034b0'::uuid, 'bale_out'),
  ('e80b0e54-0cd8-414b-b832-e152c227b051'::uuid, 'iniesta_siesta'),
  ('1a88577b-d7a9-493e-8395-b570c5d0ea20'::uuid, 'lewandogoalski'),
  ('fa93dfc7-6eba-4056-8d3b-8e6f343d1092'::uuid, 'rooney_tunes'),
  ('8ca8bcc8-61f1-4edb-9213-c9de8c6a84cc'::uuid, 'kroos_control'),
  ('0c05a99b-1771-4681-af58-f789b30c7fb9'::uuid, 'buffon_appetit'),
  ('949d0391-f19e-4c21-aa43-9840629122e9'::uuid, 'hand_of_diego')
) AS m(id, username)
WHERE p.id = m.id;

COMMIT;

-- Verification (run after COMMIT): expect 19 profiles and 0 left unrenamed.
-- A profile created after this ran would show up as unrenamed; give it a
-- handle by hand.
-- SELECT count(*) AS profiles,
--        count(*) FILTER (WHERE username NOT IN (
--          'ibra_cadabra', 'alisson_wonderland', 'pedri_dish', 'messi_kitchen',
--          'vardy_party', 'kane_and_able', 'mbappuccino', 'kante_believe_it',
--          'zizou_roulette', 'luka_at_me', 'vini_vidi_vici', 'cr7_siuuu',
--          'bale_out', 'iniesta_siesta', 'lewandogoalski', 'rooney_tunes',
--          'kroos_control', 'buffon_appetit', 'hand_of_diego'
--        )) AS unrenamed
-- FROM profiles;
