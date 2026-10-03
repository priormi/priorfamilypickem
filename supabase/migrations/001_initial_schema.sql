create extension if not exists pgcrypto with schema extensions;

create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  timezone text not null default 'America/Chicago',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table seasons (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  year integer not null,
  name text not null,
  status text not null check (status in ('DRAFT', 'ACTIVE', 'COMPLETE')),
  current_week_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, year)
);

create table players (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  display_name text not null,
  pin_hash text not null,
  is_admin boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index players_active_name_idx on players (league_id, lower(display_name)) where active;

create table player_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  abbreviation text unique not null,
  city text not null,
  name text not null,
  conference text,
  division text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table weeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  sequence_number integer not null,
  week_code text not null,
  display_name text not null,
  status text not null default 'UPCOMING' check (status in ('UPCOMING', 'OPEN', 'FINAL')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, week_code),
  unique (season_id, sequence_number)
);
alter table seasons add constraint seasons_current_week_fk foreign key (current_week_id) references weeks(id);

create table games (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  week_id uuid not null references weeks(id) on delete cascade,
  external_game_id text not null,
  home_team_id uuid not null references teams(id),
  away_team_id uuid not null references teams(id),
  kickoff_at timestamptz not null,
  status text not null check (status in ('SCHEDULED', 'IN_PROGRESS', 'FINAL', 'POSTPONED', 'CANCELED')),
  home_score integer,
  away_score integer,
  winner_team_id uuid references teams(id),
  is_tie boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, external_game_id)
);

create table picks (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  team_id uuid not null references teams(id),
  source text not null default 'PLAYER' check (source in ('PLAYER', 'AUTO')),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, game_id)
);

create table league_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  week_id uuid references weeks(id),
  event_type text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table leagues enable row level security;
alter table seasons enable row level security;
alter table players enable row level security;
alter table player_sessions enable row level security;
alter table teams enable row level security;
alter table weeks enable row level security;
alter table games enable row level security;
alter table picks enable row level security;
alter table league_events enable row level security;

create or replace function verify_player_pin(
  league_slug_input text,
  display_name_input text,
  pin_input text
)
returns table (id uuid, display_name text, is_admin boolean)
language sql
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.is_admin
  from players p
  join leagues l on l.id = p.league_id
  where l.slug = league_slug_input
    and p.active = true
    and lower(p.display_name) = lower(display_name_input)
    and p.pin_hash = extensions.crypt(pin_input, p.pin_hash)
  limit 1;
$$;
