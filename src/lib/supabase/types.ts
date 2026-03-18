export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      events: {
        Row: EventRow;
        Insert: EventInsert;
        Update: EventUpdate;
      };
      daily_decks: {
        Row: DailyDeckRow;
        Insert: DailyDeckInsert;
        Update: DailyDeckUpdate;
      };
      predictions: {
        Row: PredictionRow;
        Insert: PredictionInsert;
        Update: PredictionUpdate;
      };
      oracle_predictions: {
        Row: OraclePredictionRow;
        Insert: OraclePredictionInsert;
        Update: OraclePredictionUpdate;
      };
      scores: {
        Row: ScoreRow;
        Insert: ScoreInsert;
        Update: ScoreUpdate;
      };
      achievements: {
        Row: AchievementRow;
        Insert: AchievementInsert;
        Update: AchievementUpdate;
      };
      leaderboards: {
        Row: LeaderboardRow;
        Insert: LeaderboardInsert;
        Update: LeaderboardUpdate;
      };
    };
  };
}

// ---------- Users ----------

export interface UserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  current_streak: number;
  longest_streak: number;
  rank_title: string;
  created_at: string;
}

export interface UserInsert {
  id: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  level?: number;
  xp?: number;
  current_streak?: number;
  longest_streak?: number;
  rank_title?: string;
  created_at?: string;
}

export interface UserUpdate {
  id?: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  level?: number;
  xp?: number;
  current_streak?: number;
  longest_streak?: number;
  rank_title?: string;
  created_at?: string;
}

// ---------- Events ----------

export type EventSource = "polymarket" | "manifold";
export type ResolutionStatus = "open" | "resolved" | "cancelled";
export type TimeHorizon = "short" | "medium" | "long";

export interface EventRow {
  id: string;
  source: EventSource | null;
  source_id: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  hook_text: string | null;
  market_probability: number | null;
  outcomes: Record<string, unknown> | null;
  resolution_status: ResolutionStatus;
  resolved_at: string | null;
  resolution_outcome: string | null;
  time_horizon: TimeHorizon | null;
  raw_json: Record<string, unknown> | null;
  fetched_at: string;
}

export interface EventInsert {
  id?: string;
  source?: EventSource | null;
  source_id?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  hook_text?: string | null;
  market_probability?: number | null;
  outcomes?: Record<string, unknown> | null;
  resolution_status?: ResolutionStatus;
  resolved_at?: string | null;
  resolution_outcome?: string | null;
  time_horizon?: TimeHorizon | null;
  raw_json?: Record<string, unknown> | null;
  fetched_at?: string;
}

export interface EventUpdate {
  id?: string;
  source?: EventSource | null;
  source_id?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  hook_text?: string | null;
  market_probability?: number | null;
  outcomes?: Record<string, unknown> | null;
  resolution_status?: ResolutionStatus;
  resolved_at?: string | null;
  resolution_outcome?: string | null;
  time_horizon?: TimeHorizon | null;
  raw_json?: Record<string, unknown> | null;
  fetched_at?: string;
}

// ---------- Daily Decks ----------

export interface DailyDeckRow {
  id: string;
  date: string;
  event_ids: string[];
  golden_card_index: number;
  generated_at: string;
}

export interface DailyDeckInsert {
  id?: string;
  date: string;
  event_ids: string[];
  golden_card_index: number;
  generated_at?: string;
}

export interface DailyDeckUpdate {
  id?: string;
  date?: string;
  event_ids?: string[];
  golden_card_index?: number;
  generated_at?: string;
}

// ---------- Predictions ----------

export interface PredictionRow {
  id: string;
  user_id: string | null;
  event_id: string | null;
  deck_id: string | null;
  deck_date: string | null;
  predicted_outcome: string;
  reasoning_text: string | null;
  reasoning_score: number | null;
  reasoning_feedback: string | null;
  created_at: string;
}

export interface PredictionInsert {
  id?: string;
  user_id?: string | null;
  event_id?: string | null;
  deck_id?: string | null;
  deck_date?: string | null;
  predicted_outcome: string;
  reasoning_text?: string | null;
  reasoning_score?: number | null;
  reasoning_feedback?: string | null;
  created_at?: string;
}

export interface PredictionUpdate {
  id?: string;
  user_id?: string | null;
  event_id?: string | null;
  deck_id?: string | null;
  deck_date?: string | null;
  predicted_outcome?: string;
  reasoning_text?: string | null;
  reasoning_score?: number | null;
  reasoning_feedback?: string | null;
  created_at?: string;
}

// ---------- Oracle Predictions ----------

export interface OraclePredictionRow {
  id: string;
  event_id: string | null;
  deck_id: string | null;
  predicted_probability: number | null;
  claude_reasoning: string | null;
  created_at: string;
}

export interface OraclePredictionInsert {
  id?: string;
  event_id?: string | null;
  deck_id?: string | null;
  predicted_probability?: number | null;
  claude_reasoning?: string | null;
  created_at?: string;
}

export interface OraclePredictionUpdate {
  id?: string;
  event_id?: string | null;
  deck_id?: string | null;
  predicted_probability?: number | null;
  claude_reasoning?: string | null;
  created_at?: string;
}

// ---------- Scores ----------

export interface ScoreRow {
  id: string;
  prediction_id: string | null;
  user_id: string | null;
  base_points: number;
  contrarian_bonus: number;
  golden_multiplier: number;
  streak_multiplier: number;
  reasoning_bonus: number;
  total_points: number;
  created_at: string;
}

export interface ScoreInsert {
  id?: string;
  prediction_id?: string | null;
  user_id?: string | null;
  base_points?: number;
  contrarian_bonus?: number;
  golden_multiplier?: number;
  streak_multiplier?: number;
  reasoning_bonus?: number;
  total_points?: number;
  created_at?: string;
}

export interface ScoreUpdate {
  id?: string;
  prediction_id?: string | null;
  user_id?: string | null;
  base_points?: number;
  contrarian_bonus?: number;
  golden_multiplier?: number;
  streak_multiplier?: number;
  reasoning_bonus?: number;
  total_points?: number;
  created_at?: string;
}

// ---------- Achievements ----------

export interface AchievementRow {
  id: string;
  user_id: string | null;
  achievement_type: string;
  achievement_data: Record<string, unknown> | null;
  achieved_at: string;
}

export interface AchievementInsert {
  id?: string;
  user_id?: string | null;
  achievement_type: string;
  achievement_data?: Record<string, unknown> | null;
  achieved_at?: string;
}

export interface AchievementUpdate {
  id?: string;
  user_id?: string | null;
  achievement_type?: string;
  achievement_data?: Record<string, unknown> | null;
  achieved_at?: string;
}

// ---------- Leaderboards ----------

export type LeaderboardPeriod = "daily" | "weekly" | "alltime";

export interface LeaderboardRow {
  id: string;
  period: LeaderboardPeriod;
  user_id: string | null;
  rank: number | null;
  total_score: number | null;
  snapshot_at: string;
}

export interface LeaderboardInsert {
  id?: string;
  period: LeaderboardPeriod;
  user_id?: string | null;
  rank?: number | null;
  total_score?: number | null;
  snapshot_at?: string;
}

export interface LeaderboardUpdate {
  id?: string;
  period?: LeaderboardPeriod;
  user_id?: string | null;
  rank?: number | null;
  total_score?: number | null;
  snapshot_at?: string;
}
