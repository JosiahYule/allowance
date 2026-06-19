# Allowance

A mobile-first personal finance PWA built around one honest number: **how much
is safe to spend**. Log income and expenses, set recurring bills and budgets,
save toward goals — and see what's left, today and for the rest of the month.

- **Stack:** React 19, Vite 8, Tailwind 4, React Router 7
- **Backend:** Supabase (Postgres + Auth + Row Level Security)
- **PWA:** installable, offline-capable, self-hosted fonts

## The safe-to-spend model

The home screen answers "what can I spend?" with:

```
available = incomeBasis + rollover − totalSpent − upcomingBills
daily     = available ÷ days left in the month
```

- **incomeBasis** reconciles your *expected* monthly income (a setting) with
  income you actually log: the setting is a floor, and a larger-than-expected
  deposit raises it. Either one alone works.
- **totalSpent** splits into bills (recurring), savings (goal contributions),
  and discretionary spending.
- **upcomingBills** subtracts recurring bills still due later this month, so the
  number stays steady instead of lurching each time a bill auto-posts.
- **rollover** (optional) carries last month's leftover forward.

All of this lives in `src/lib/finance.js` as pure, unit-tested functions.

## Getting started

```bash
npm install
```

Create a `.env` (or `.env.local`) with your Supabase project credentials:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then:

```bash
npm run dev      # start the dev server
npm run build    # production build (+ service worker)
npm run preview  # preview the production build
npm run lint     # eslint
npm test         # run the unit tests (vitest)
```

## Database

Schema changes live in `supabase/migrations/` and must be applied to your
Supabase project. Apply them in order, either with the Supabase CLI:

```bash
supabase db push
```

or by pasting each file into the Supabase SQL editor (oldest first). The app
degrades gracefully if a migration hasn't run yet, but features (recurring,
goals, custom categories, rollover) need their migration applied to work.

| Migration | Adds |
|-----------|------|
| `001_allowance_additions` | recurring transactions, custom categories, savings goals |
| `002_user_settings` | onboarding state + monthly income |
| `003_fix_transactions_rls` | full RLS coverage (select/insert/update/delete) |
| `004_safe_to_spend_model` | goal-linked transactions, idempotent recurring, indexes, rollover |

## Project layout

```
src/
  lib/
    finance.js     # safe-to-spend engine (pure, tested)
    recurring.js   # recurring schedule math (pure, tested)
    dates.js       # timezone-safe date helpers (pure, tested)
    categories.js  # category data access
    supabase.js    # client + cached current-user helper
  pages/           # one file per route
  components/      # shared UI (nav, sheets, insights, toast…)
```
