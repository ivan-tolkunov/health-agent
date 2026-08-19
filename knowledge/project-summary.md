# Health Agent — Project Summary

## Purpose

A private, mobile-friendly web dashboard for one user in Toronto to consolidate:

- WHOOP recovery, sleep, strain, energy expenditure, and workouts
- FitBee nutrition exports
- Manual weight entries
- Later: trends and a read-only Pi-powered AI coach/chat

Primary goal: reduce weight from **82 kg** to **70 kg**.

## Stack

- Next.js 16, TypeScript, App Router
- PGlite (embedded persistent PostgreSQL) + Drizzle ORM
- Tailwind CSS 4
- shadcn/ui (Radix UI components) and Lucide icons
- Sonner for temporary notifications
- Vitest
- Jujutsu (`jj`) for version control

## Privacy and local data

- `data/`, `storage/`, and `.env*` are ignored by version control.
- `.env.example` documents required environment keys.
- WHOOP OAuth access and refresh tokens are AES-256-GCM encrypted at rest with `TOKEN_ENCRYPTION_KEY`.
- Never commit or print values in `.env`, PGlite files, or health exports.
- PGlite database location defaults to `./storage/pglite`.

## WHOOP integration

Official WHOOP OAuth 2.0 is implemented.

Routes:

- `GET /api/whoop/connect` starts OAuth
- `GET /api/whoop/callback` exchanges the authorization code
- `POST /api/whoop/sync` imports 90 days

Requested scopes:

- `offline`
- `read:profile`
- `read:body_measurement`
- `read:cycles`
- `read:recovery`
- `read:sleep`
- `read:workout`

WHOOP API rate limits provided by the user:

- 10,000 requests/day
- 100 requests/minute

The sync paginates WHOOP collections and imports cycles, recoveries, sleeps, workouts, and profile. It has been successfully connected and synced.

Important OAuth configuration:

```text
http://localhost:3000/api/whoop/callback
```

must exactly match the callback registered in WHOOP Developer Dashboard.

## FitBee integration

FitBee has no API in this project. The user pastes its text export through **Add FitBee**.

Example format is stored privately at `data/FitBee.txt`. The parser in `src/lib/fitbee/parser.ts` extracts:

- Report date
- Daily calories and target
- Protein, carbohydrate, fat totals
- Steps
- Meal sections
- Food-level entries and macros

Each import is immutable. For a date, the UI selects the newest imported snapshot, so breakfast/lunch/dinner re-exports do not get summed as duplicate intake.

A successful FitBee import closes the dialog and routes to its report date.

## Database tables

- `whoop_connection`
- `whoop_profile`
- `whoop_cycles`
- `whoop_recoveries`
- `whoop_sleeps`
- `whoop_workouts`
- `nutrition_imports`
- `nutrition_foods`
- `weight_entries`
- `daily_insights`

Schema: `src/lib/db/schema.ts`
DDL initialization: `src/lib/db/index.ts`

## Dashboard behavior

- Dashboard is date-driven using the `?date=YYYY-MM-DD` parameter.
- The arrows navigate Toronto calendar days. Future navigation is disabled.
- Each selected day displays only that day’s recovery, sleep, strain, nutrition, energy expenditure, workouts, and latest weight at/before that date.
- Nutrition and energy-burned cards are adjacent; nutrition is first.
- The calorie bank is WHOOP calories burned minus FitBee calories consumed, summed only for dates having both data sources.
- WHOOP callback/sync statuses appear through Sonner for five seconds and then remove `whoop` and `records` from the URL; the selected `date` remains.

## Pi daily insight

The dashboard’s **Pi Coach** panel can generate an on-demand daily insight for the selected date.

- `POST /api/coach/daily-summary` fetches every date-matched database record: WHOOP cycles, recoveries, sleeps (including naps), workouts, every FitBee import and food record, and same-day weight entries. Source payloads and FitBee source text are included for full context.
- The complete export is passed to a fresh, tool-free Pi SDK session, so it cannot edit data and does not persist health data or chat history. The resulting latest insight is saved for its dashboard date.
- The agent uses `openai-codex/gpt-5.6-luna` and is instructed to provide a non-diagnostic, information-rich daily summary plus a medical-advice disclaimer.
- Pi model authentication follows the local Pi installation configuration (normally `~/.pi/agent/auth.json`). If GPT-5.6 Luna is unavailable, the UI reports that configuration is needed.
- The Pi Coach card is keyed to the selected dashboard date and its insight can be regenerated on demand. `daily_insights` keeps one row per date, overwriting the previous insight for that date; no insight history is retained.

Files:

- `src/lib/coach/daily-summary.ts`
- `src/app/api/coach/daily-summary/route.ts`
- `src/components/daily-summary-panel.tsx`

## Weight logging

Implemented manual weight entry using shadcn/ui Dialog, Input, Label, and Button:

- The small `+` in the Weight metric card opens the dialog.
- Entry is recorded for the currently selected dashboard date.
- Valid range: 30–300 kg; value is stored to one decimal place.
- The latest measurement appears in the hero goal summary.
- The Weight card shows the measurement for the selected day, or the latest previous measurement.
- A successful entry shows a five-second Sonner success message.

Files:

- `src/app/actions/weight.ts`
- `src/components/log-weight-dialog.tsx`

## UI direction

The user specifically requested:

- Minimal, simple design
- No gradients
- Compact mobile layout
- Daily metrics visible without scrolling through one card at a time
- Use UI libraries before custom components

Adopted component policy:

1. Prefer shadcn/ui/Radix UI for interactions and common controls.
2. Prefer Lucide for icons.
3. Prefer Sonner for notifications.
4. Create custom components only if the library does not cover the use case.

Current UI library setup:

- `components.json`
- `src/components/ui/button.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/sonner.tsx`
- `src/lib/utils.ts`

## PGlite operational note

PGlite is single-process. Avoid opening the same persistent `storage/pglite` directory concurrently from independent processes (for example, a dev server plus an ad-hoc Node script, or a build process that uses the persistent DB).

`src/lib/db/index.ts` uses `memory://` while `NEXT_PHASE=phase-production-build` to prevent builds touching the real persistent database.

A previous stale WAL condition was recovered with a backup plus `pg_resetwal` because the local system PostgreSQL version matches PGlite’s PostgreSQL 18 data directory. The database was verified afterward. Do not use `pg_resetwal` unless PGlite cannot reopen and a backup exists.

## Commands

```bash
pnpm dev
pnpm lint
pnpm test
pnpm exec tsc --noEmit
pnpm build

jj status
jj diff
jj commit -m "message"
```

## Validation completed most recently

- PGlite `weight_entries` table exists
- Dashboard and weight-dialog trigger respond
- ESLint passes
- TypeScript passes
- Vitest passes
- Production build passes
- pi-lens diagnostics reported no issues before the latest context note

## Remaining roadmap

1. Improve/finish shadcn migration for existing FitBee dialog and other handcrafted controls.
2. Weight history chart and trend analysis.
3. Weekly/monthly views and correlations: recovery, sleep, training, intake, energy balance, and weight.
4. Expand Pi Coach with read-only health-data tools and chat.
5. Authentication for home-server access and deployment configuration (reverse proxy, HTTPS, backups).
