-- ============================================
-- Prediction Game Schema
-- ============================================

-- Users table
create table public.users (
  id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  level int default 1,
  xp int default 0,
  current_streak int default 0,
  longest_streak int default 0,
  rank_title text default 'Novice',
  created_at timestamptz default now()
);

-- Events table
create table public.events (
  id uuid primary key default gen_random_uuid(),
  source text check (source in ('polymarket', 'manifold')),
  source_id text,
  title text,
  description text,
  category text,
  hook_text text,
  market_probability float,
  outcomes jsonb,
  resolution_status text default 'open' check (resolution_status in ('open', 'resolved', 'cancelled')),
  resolved_at timestamptz,
  resolution_outcome text,
  time_horizon text check (time_horizon in ('short', 'medium', 'long')),
  raw_json jsonb,
  fetched_at timestamptz default now(),
  unique (source, source_id)
);

-- Daily decks table
create table public.daily_decks (
  id uuid primary key default gen_random_uuid(),
  date date unique not null,
  event_ids uuid[] not null,
  golden_card_index int not null,
  generated_at timestamptz default now()
);

-- Predictions table
create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users on delete cascade,
  event_id uuid references public.events on delete cascade,
  deck_id uuid references public.daily_decks on delete set null,
  deck_date date,
  predicted_outcome text not null,
  reasoning_text text,
  reasoning_score int,
  reasoning_feedback text,
  created_at timestamptz default now(),
  unique (user_id, event_id)
);

-- Oracle predictions table
create table public.oracle_predictions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events on delete cascade,
  deck_id uuid references public.daily_decks on delete set null,
  predicted_probability float,
  claude_reasoning text,
  created_at timestamptz default now()
);

-- Scores table
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid references public.predictions on delete cascade,
  user_id uuid references public.users on delete cascade,
  base_points int default 0,
  contrarian_bonus int default 0,
  golden_multiplier float default 1.0,
  streak_multiplier float default 1.0,
  reasoning_bonus int default 0,
  total_points int default 0,
  created_at timestamptz default now()
);

-- Achievements table
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users on delete cascade,
  achievement_type text not null,
  achievement_data jsonb,
  achieved_at timestamptz default now()
);

-- Leaderboards table
create table public.leaderboards (
  id uuid primary key default gen_random_uuid(),
  period text not null check (period in ('daily', 'weekly', 'alltime')),
  user_id uuid references public.users on delete cascade,
  rank int,
  total_score int,
  snapshot_at timestamptz default now()
);

-- ============================================
-- Indexes
-- ============================================

create index idx_events_resolution_status on public.events (resolution_status);
create index idx_events_source_source_id on public.events (source, source_id);
create index idx_predictions_user_id on public.predictions (user_id);
create index idx_predictions_event_id on public.predictions (event_id);
create index idx_scores_user_id on public.scores (user_id);
create index idx_leaderboards_period_rank on public.leaderboards (period, rank);
create index idx_daily_decks_date on public.daily_decks (date);

-- ============================================
-- Row Level Security
-- ============================================

alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.daily_decks enable row level security;
alter table public.predictions enable row level security;
alter table public.oracle_predictions enable row level security;
alter table public.scores enable row level security;
alter table public.achievements enable row level security;
alter table public.leaderboards enable row level security;

-- Users: read own, update own
create policy "Users can read own data" on public.users
  for select using (auth.uid() = id);
create policy "Users can update own data" on public.users
  for update using (auth.uid() = id);
create policy "Users can insert own row" on public.users
  for insert with check (auth.uid() = id);

-- Events: publicly readable
create policy "Events are publicly readable" on public.events
  for select using (true);

-- Daily decks: publicly readable
create policy "Daily decks are publicly readable" on public.daily_decks
  for select using (true);

-- Predictions: users read/insert own
create policy "Users can read own predictions" on public.predictions
  for select using (auth.uid() = user_id);
create policy "Users can insert own predictions" on public.predictions
  for insert with check (auth.uid() = user_id);

-- Oracle predictions: publicly readable
create policy "Oracle predictions are publicly readable" on public.oracle_predictions
  for select using (true);

-- Scores: users read own
create policy "Users can read own scores" on public.scores
  for select using (auth.uid() = user_id);

-- Achievements: users read own
create policy "Users can read own achievements" on public.achievements
  for select using (auth.uid() = user_id);

-- Leaderboards: publicly readable
create policy "Leaderboards are publicly readable" on public.leaderboards
  for select using (true);
