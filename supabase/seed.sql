insert into leagues (name, slug, timezone)
values ('Prior Family Pickem', 'prior-family-pickem', 'America/Chicago')
on conflict (slug) do update set name = excluded.name;

insert into teams (abbreviation, city, name, conference, division)
values
  ('ARI', 'Arizona', 'Cardinals', 'NFC', 'NFC West'),
  ('ATL', 'Atlanta', 'Falcons', 'NFC', 'NFC South'),
  ('BAL', 'Baltimore', 'Ravens', 'AFC', 'AFC North'),
  ('BUF', 'Buffalo', 'Bills', 'AFC', 'AFC East'),
  ('CAR', 'Carolina', 'Panthers', 'NFC', 'NFC South'),
  ('CHI', 'Chicago', 'Bears', 'NFC', 'NFC North'),
  ('CIN', 'Cincinnati', 'Bengals', 'AFC', 'AFC North'),
  ('CLE', 'Cleveland', 'Browns', 'AFC', 'AFC North'),
  ('DAL', 'Dallas', 'Cowboys', 'NFC', 'NFC East'),
  ('DEN', 'Denver', 'Broncos', 'AFC', 'AFC West'),
  ('DET', 'Detroit', 'Lions', 'NFC', 'NFC North'),
  ('GB', 'Green Bay', 'Packers', 'NFC', 'NFC North'),
  ('HOU', 'Houston', 'Texans', 'AFC', 'AFC South'),
  ('IND', 'Indianapolis', 'Colts', 'AFC', 'AFC South'),
  ('JAX', 'Jacksonville', 'Jaguars', 'AFC', 'AFC South'),
  ('KC', 'Kansas City', 'Chiefs', 'AFC', 'AFC West'),
  ('LV', 'Las Vegas', 'Raiders', 'AFC', 'AFC West'),
  ('LAC', 'Los Angeles', 'Chargers', 'AFC', 'AFC West'),
  ('LAR', 'Los Angeles', 'Rams', 'NFC', 'NFC West'),
  ('MIA', 'Miami', 'Dolphins', 'AFC', 'AFC East'),
  ('MIN', 'Minnesota', 'Vikings', 'NFC', 'NFC North'),
  ('NE', 'New England', 'Patriots', 'AFC', 'AFC East'),
  ('NO', 'New Orleans', 'Saints', 'NFC', 'NFC South'),
  ('NYG', 'New York', 'Giants', 'NFC', 'NFC East'),
  ('NYJ', 'New York', 'Jets', 'AFC', 'AFC East'),
  ('PHI', 'Philadelphia', 'Eagles', 'NFC', 'NFC East'),
  ('PIT', 'Pittsburgh', 'Steelers', 'AFC', 'AFC North'),
  ('SF', 'San Francisco', '49ers', 'NFC', 'NFC West'),
  ('SEA', 'Seattle', 'Seahawks', 'NFC', 'NFC West'),
  ('TB', 'Tampa Bay', 'Buccaneers', 'NFC', 'NFC South'),
  ('TEN', 'Tennessee', 'Titans', 'AFC', 'AFC South'),
  ('WAS', 'Washington', 'Commanders', 'NFC', 'NFC East')
on conflict (abbreviation) do update set
  city = excluded.city,
  name = excluded.name,
  conference = excluded.conference,
  division = excluded.division,
  active = true;


with league as (select id from leagues where slug = 'prior-family-pickem')
insert into seasons (league_id, year, name, status)
select id, 2026, '2026 NFL Pickem', 'ACTIVE' from league
on conflict (league_id, year) do update set name = excluded.name, status = excluded.status;

with league as (select id from leagues where slug = 'prior-family-pickem'),
seed_players(display_name, pin, is_admin) as (
  values ('Mike', '1234', true), ('Heather', '1234', false), ('Chloe', '1234', false), ('Sophia', '1234', false)
)
insert into players (league_id, display_name, pin_hash, is_admin)
select league.id, seed_players.display_name, extensions.crypt(seed_players.pin, extensions.gen_salt('bf')), seed_players.is_admin
from league cross join seed_players
on conflict do nothing;
