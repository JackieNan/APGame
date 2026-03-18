# APGame — AI Prediction Game

## What is this?

A web-based prediction game where players predict real-world events sourced from Manifold Markets. AI curates daily event decks, makes its own predictions (Oracle), and scores player reasoning. Free to play, no real money involved.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui (dark theme, amber/gold accents)
- **Animation**: Framer Motion
- **Database**: Supabase PostgreSQL + Auth (email/password)
- **AI**: SiliconFlow API (OpenAI-compatible) — model: `Qwen/Qwen2.5-7B-Instruct`
- **Hosting**: Vercel + Vercel Cron
- **Repo**: https://github.com/JackieNan/APGame
- **Live**: https://apgame.vercel.app

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Dashboard (streak, level, deck status)
│   ├── layout.tsx                        # Dark layout + nav + Sonner toaster
│   ├── (auth)/login/page.tsx             # Email/password login
│   ├── (auth)/signup/page.tsx            # Signup (calls /api/auth/create-profile)
│   ├── (game)/play/page.tsx              # Core: 5 prediction cards
│   ├── (game)/results/page.tsx           # Results + Oracle comparison + reasoning feedback
│   ├── (game)/history/page.tsx           # Past predictions
│   ├── leaderboard/page.tsx              # Daily/Weekly/All Time rankings
│   ├── profile/page.tsx                  # User stats + achievements
│   └── api/
│       ├── auth/create-profile/route.ts  # Server-side user profile creation (bypasses RLS)
│       ├── cron/fetch-events/route.ts    # Pull events from Manifold (+ Polymarket fallback)
│       ├── cron/generate-deck/route.ts   # AI curates 5 events + Oracle predictions
│       ├── cron/check-resolutions/route.ts # Detect resolved events, calculate scores
│       ├── cron/daily-maintenance/route.ts # Update streaks, snapshot leaderboards
│       ├── predictions/route.ts          # Submit/get predictions
│       └── reasoning/route.ts            # Trigger AI reasoning evaluation
├── lib/
│   ├── ai/
│   │   ├── client.ts                     # SiliconFlow API wrapper + model constants
│   │   ├── curator.ts                    # AI event curation (picks 5 best events)
│   │   ├── oracle.ts                     # Oracle probability predictions
│   │   └── reasoning-scorer.ts           # Player reasoning evaluation (0-50)
│   ├── polymarket.ts                     # Polymarket Gamma API client
│   ├── manifold.ts                       # Manifold Markets API client (primary source)
│   ├── scoring.ts                        # Scoring engine
│   ├── progression.ts                    # XP/levels/streaks/achievements
│   ├── types.ts                          # NormalizedEvent, ResolutionStatus
│   └── supabase/
│       ├── client.ts                     # Browser + server Supabase clients
│       ├── schema.sql                    # Full DB schema (8 tables + RLS + indexes)
│       └── types.ts                      # TypeScript types for all tables
├── components/
│   ├── prediction-card.tsx               # Event card with outcome buttons + reasoning input
│   ├── result-reveal.tsx                 # Result card with Oracle reasoning + points breakdown
│   ├── streak-counter.tsx                # Fire streak display
│   ├── leaderboard-table.tsx             # Ranked table
│   └── probability-gauge.tsx             # Visual probability bar
└── hooks/
    ├── use-daily-deck.ts                 # Fetch latest deck + events + played status
    └── use-user-stats.ts                 # User level/xp/streak/scores
```

## Game Mechanics

### Daily Flow
1. Cron fetches events from Manifold (prioritizes events closing within 3 months)
2. AI curates 5 events: 2 short-term (this week) + 2 medium (this month) + 1 long (this quarter)
3. 1 random card is the "Golden Card" (3x score multiplier, revealed after submit)
4. Player predicts YES/NO + optional reasoning text
5. Reasoning is scored by AI (0-50 points)
6. When events resolve, scores are calculated

### Scoring Formula
```
total = (basePoints + contrarianBonus + reasoningBonus) × goldenMultiplier × streakMultiplier
```
- **Base**: 50 if correct
- **Contrarian Bonus**: 0-200, higher when going against market consensus and being right
- **Reasoning Bonus**: 0-50, AI-evaluated quality of reasoning
- **Golden Multiplier**: 3x if golden card, 1x otherwise
- **Streak Multiplier**: 1x (1-3 days) → 1.5x (4-7) → 2x (8-14) → 3x (15+)

### Progression
- 50 levels, exponential XP: `floor(100 × 1.15^(level-1))`
- Ranks: Novice → Apprentice → Analyst → Strategist → Oracle → Sage → Grandmaster
- 10 achievements (first prediction, perfect day, streaks, etc.)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase publishable key
SUPABASE_SERVICE_ROLE_KEY      # Supabase secret key (server-side only)
AI_API_KEY                     # SiliconFlow API key
AI_BASE_URL                    # https://api.siliconflow.cn/v1
CRON_SECRET                    # Auth token for cron endpoints
```

## Cron Jobs (Vercel)

| Schedule (UTC) | Endpoint | Action |
|---|---|---|
| 0 18 * * * | /api/cron/fetch-events | Pull events from Manifold |
| 0 19 * * * | /api/cron/generate-deck | AI curates 5 events + Oracle predictions |
| 0 20 * * * | /api/cron/check-resolutions | Check for resolved events, calculate scores |
| 0 16 * * * | /api/cron/daily-maintenance | Update streaks, snapshot leaderboards |

Manual trigger: `curl -H "Authorization: Bearer $CRON_SECRET" https://apgame.vercel.app/api/cron/<job>`

## Key Design Decisions

- **Supabase client is untyped** — removed Database generic to avoid type conflicts with the auto-generated Supabase types. All DB responses are cast via `as any`.
- **User profile created via server API** — `/api/auth/create-profile` uses service role key to bypass RLS, because Supabase may require email confirmation before auth.uid() is available.
- **Polymarket is fallback** — Gamma API often unreachable from certain networks. Manifold is primary. `fetch-events` uses `Promise.allSettled` so one failure doesn't break the other.
- **Deck generated for today** — not tomorrow. Allows immediate play after generation.
- **Deck can be regenerated** — same-date deck is deleted before inserting new one.
- **AI models use SiliconFlow** — OpenAI-compatible API. Model is `Qwen/Qwen2.5-7B-Instruct` for all 3 roles (curator, oracle, scorer) to minimize cost. Can be upgraded individually in `src/lib/ai/client.ts`.
- **Reasoning scoring is fire-and-forget** — triggered on submit, results appear on results page after a few seconds.

## Common Tasks

### Regenerate today's deck
```bash
curl -H "Authorization: Bearer apgame-cron-secret-2026" https://apgame.vercel.app/api/cron/fetch-events
curl -H "Authorization: Bearer apgame-cron-secret-2026" https://apgame.vercel.app/api/cron/generate-deck
```

### Deploy
```bash
git add -A && git commit -m "..." && git push && npx vercel --yes --prod
```

### Run locally
```bash
npm run dev
```

## Known Limitations

- Vercel Hobby plan: cron jobs limited to once per day
- Polymarket API unreachable from some networks (China)
- No email confirmation flow — disabled in Supabase settings
- Package name must be lowercase (`apgame`)
