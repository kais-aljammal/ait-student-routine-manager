# PROJECT HANDOFF

## 1. PROJECT OVERVIEW

### App identity and purpose
- **Name:** `AI Student Routine Manager`
- **What it does:** Helps students build a day routine by collecting fixed classes + life constraints, generating task blocks (AI or deterministic day-plan), showing a timeline dashboard, tracking completion, and sending Telegram reminders before upcoming tasks.
- **Who it is for:** University/college students who need structured daily planning around classes, commuting, meals, study, and personal activities.

### Full tech stack (exact package versions from `package.json`)
- **Framework/runtime**
  - `next@15.3.1`
  - `react@^19.0.0`
  - `react-dom@^19.0.0`
- **Backend/data/auth**
  - `@supabase/supabase-js@^2.49.4`
  - `@supabase/ssr@^0.6.1`
- **AI**
  - `@google/generative-ai@^0.24.0`
  - `groq-sdk@^1.1.2`
  - OpenRouter is used via direct `fetch` (no package)
- **Styling/tooling**
  - `tailwindcss@^3.4.17`
  - `postcss@^8.5.3`
  - `autoprefixer@^10.4.21`
- **TypeScript/lint**
  - `typescript@^5`
  - `eslint@^9`
  - `eslint-config-next@15.3.1`
  - `@eslint/eslintrc@^3`
  - `@types/node@^20`
  - `@types/react@^19`
  - `@types/react-dom@^19`

### Hosting setup and external services
- **App hosting target:** Next.js app designed for Vercel or local Node host.
- **Database/Auth:** Supabase project (Postgres + Auth + RLS).
- **AI providers:** Gemini, OpenRouter, Groq (fallback sequence in generation route).
- **Notifications:** Telegram Bot API.
- **Scheduling:** External cron trigger from cron-job.org to hit `/api/send-alerts`.

### Free-tier constraint
- Entire architecture is implemented to stay in free tiers:
  - Supabase free + RLS.
  - Vercel hobby/local.
  - Gemini/OpenRouter/Groq free models/limits.
  - Telegram bot free.
  - cron-job.org free scheduled ping.
- App includes a per-user daily generation limit via `ai_usage_limits` table and `FREE_DAILY_GENERATION_LIMIT`.

---

## 2. COMPLETE FILE TREE

This section lists every project file and folder that currently exists in source/config scope and operational runtime scope.

### Root directories
- `.next/` - Next.js build output and runtime manifests/chunks (generated; currently 216 files).
- `app/` - Next.js App Router pages, API route handlers, and dashboard client components.
- `components/` - Reserved directory (currently empty).
- `lib/` - Shared business logic, parsers, date helpers, Supabase clients, AI/Telegram helpers.
- `node_modules/` - Installed third-party dependencies (generated; currently 20,401 files).
- `public/` - Static assets folder (currently empty).
- `supabase/` - SQL migrations for schema and usage-limit table.

### Root files
- `.env.example` - environment variable template with comments.
- `.env.local` - local environment variable values (contains secrets; gitignored).
- `.gitignore` - ignore rules for env/build/dependency artifacts.
- `eslint.config.mjs` - ESLint config using `next/core-web-vitals`.
- `middleware.ts` - global Next middleware entrypoint with static-route skip + Supabase session update.
- `next-env.d.ts` - Next TypeScript ambient declarations.
- `next.config.ts` - Next.js config object (currently default empty).
- `package-lock.json` - npm lockfile.
- `package.json` - scripts and dependency manifest.
- `postcss.config.mjs` - PostCSS plugins config (Tailwind + Autoprefixer).
- `PROJECT_STATUS_AND_PLAN.md` - older planning/status document from earlier phase.
- `tailwind.config.ts` - Tailwind content scan paths and theme config.
- `tsconfig.json` - TypeScript compiler config with strict mode and `@/*` path alias.

### `app/` tree
- `app/globals.css` - Tailwind layer imports.
- `app/layout.tsx` - root HTML/body layout and metadata.
- `app/page.tsx` - home/landing page linking to auth/dashboard.
- `app/login/page.tsx` - login page wrapper + suspense fallback.
- `app/login/login-form.tsx` - login form logic/UI with timeout/spinner/error handling.
- `app/signup/page.tsx` - signup page wrapper.
- `app/signup/signup-form.tsx` - signup form logic/UI with timeout/spinner/error handling.
- `app/auth/callback/route.ts` - email auth callback route exchanging code for session.
- `app/dashboard/page.tsx` - server page shell loading auth/profile and passing props to dashboard client.
- `app/dashboard/dashboard-client.tsx` - main client dashboard (tasks fetch/cache/timeline/progress/new routine/telegram save).
- `app/dashboard/logout-button.tsx` - sign-out button with loading/error feedback.
- `app/dashboard/error.tsx` - dashboard segment error boundary UI + retry.
- `app/dashboard/new-routine-modal.tsx` - interactive modal for day-plan inputs, validation, templates.
- `app/dashboard/constraints/page.tsx` - constraints page server loader and form host.
- `app/dashboard/constraints/constraints-form.tsx` - constraints input form and Supabase upsert.
- `app/api/generate-schedule/route.ts` - schedule generation API with provider fallback + validation + insert.
- `app/api/tasks/route.ts` - tasks fetch/delete API for a selected schedule date.
- `app/api/tasks/[id]/route.ts` - task completion PATCH API with ownership checks.
- `app/api/send-alerts/route.ts` - cron-targeted reminder dispatch API.

### `lib/` tree
- `lib/date.ts` - timezone date/time helpers.
- `lib/gemini.ts` - alternate reusable provider/fallback helper (not primary route path now).
- `lib/telegram.ts` - Telegram send helper.
- `lib/constraints/types.ts` - fixed class/life variable types and defaults.
- `lib/constraints/parse.ts` - constraints parsing/sanitization utilities.
- `lib/routine/day-plan.ts` - deterministic schedule generation from explicit day-plan input.
- `lib/schedule/generated-task.ts` - AI JSON extraction/parsing/validation for generated tasks.
- `lib/schedule/prompt.ts` - strict prompt builder for LLM schedule output.
- `lib/supabase/client.ts` - browser Supabase singleton client.
- `lib/supabase/server.ts` - server Supabase client factory with `cache()`.
- `lib/supabase/middleware.ts` - middleware session refresh + redirects.
- `lib/supabase/service-role.ts` - server-only Supabase service role client.

### `supabase/` tree
- `supabase/migrations/001_initial_schema.sql` - baseline schema (profiles/constraints/tasks, triggers, RLS).
- `supabase/migrations/002_ai_usage_limits.sql` - `ai_usage_limits` table, trigger, and RLS policies.

### Generated/runtime trees (present now)
- `.next/` - full compiled server/client artifacts for current build.
- `node_modules/` - all installed package files from npm.

---

## 3. DATABASE SCHEMA (FULL DETAIL)

Source: `supabase/migrations/001_initial_schema.sql`, `supabase/migrations/002_ai_usage_limits.sql`

### Enum types
- `public.task_category` with values:
  - `'class'`
  - `'study'`
  - `'life'`

### Table: `public.profiles`
- Columns:
  - `id uuid primary key references auth.users(id) on delete cascade`
  - `full_name text`
  - `timezone text not null default 'UTC'`
  - `telegram_chat_id text`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- Indexes:
  - `profiles_telegram_chat_id_idx` on `(telegram_chat_id)` with partial condition `where telegram_chat_id is not null`
- RLS:
  - enabled via `alter table public.profiles enable row level security;`
- Policies:
  - `"profiles_select_own"` for `select` using `(auth.uid() = id)`
  - `"profiles_update_own"` for `update` using `(auth.uid() = id)`

### Table: `public.constraints`
- Columns:
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references public.profiles(id) on delete cascade`
  - `fixed_schedule jsonb not null default '[]'::jsonb`
  - `life_variables jsonb not null default '{}'::jsonb`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - unique constraint on `(user_id)`
- Indexes:
  - unique index from `unique(user_id)` constraint
- RLS:
  - enabled via `alter table public.constraints enable row level security;`
- Policies:
  - `"constraints_select_own"` for `select` using `(auth.uid() = user_id)`
  - `"constraints_insert_own"` for `insert` with check `(auth.uid() = user_id)`
  - `"constraints_update_own"` for `update` using `(auth.uid() = user_id)`
  - `"constraints_delete_own"` for `delete` using `(auth.uid() = user_id)`

### Table: `public.tasks`
- Columns:
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references public.profiles(id) on delete cascade`
  - `title text not null`
  - `category public.task_category not null`
  - `starts_at timestamptz not null`
  - `ends_at timestamptz not null`
  - `schedule_date date not null`
  - `completed boolean not null default false`
  - `alert_sent_at timestamptz`
  - `created_at timestamptz not null default now()`
- Indexes:
  - `tasks_user_schedule_date_idx` on `(user_id, schedule_date)`
  - `tasks_user_starts_at_idx` on `(user_id, starts_at)`
- RLS:
  - enabled via `alter table public.tasks enable row level security;`
- Policies:
  - `"tasks_select_own"` for `select` using `(auth.uid() = user_id)`
  - `"tasks_insert_own"` for `insert` with check `(auth.uid() = user_id)`
  - `"tasks_update_own"` for `update` using `(auth.uid() = user_id)`
  - `"tasks_delete_own"` for `delete` using `(auth.uid() = user_id)`

### Table: `public.ai_usage_limits`
- Columns:
  - `user_id uuid not null references public.profiles(id) on delete cascade`
  - `usage_date date not null`
  - `requests_count integer not null default 0 check (requests_count >= 0)`
  - `updated_at timestamptz not null default now()`
  - primary key `(user_id, usage_date)`
- Indexes:
  - implicit PK index on `(user_id, usage_date)`
- RLS:
  - enabled via `alter table public.ai_usage_limits enable row level security;`
- Policies:
  - `"ai_usage_limits_select_own"` for `select` using `(auth.uid() = user_id)`
  - `"ai_usage_limits_insert_own"` for `insert` with check `(auth.uid() = user_id)`
  - `"ai_usage_limits_update_own"` for `update` using `(auth.uid() = user_id)`

### Functions
- `public.set_updated_at() returns trigger`
  - PL/pgSQL trigger function:
    - `new.updated_at := now();`
    - `return new;`
- `public.handle_new_user() returns trigger`
  - `security definer`, `set search_path = public`
  - inserts into `public.profiles` with:
    - `id = new.id`
    - `full_name = coalesce(new.raw_user_meta_data ->> 'full_name', new.email)`

### Triggers
- `profiles_set_updated_at` on `public.profiles` before update -> `public.set_updated_at()`
- `constraints_set_updated_at` on `public.constraints` before update -> `public.set_updated_at()`
- `ai_usage_limits_set_updated_at` on `public.ai_usage_limits` before update -> `public.set_updated_at()`
- `on_auth_user_created` on `auth.users` after insert -> `public.handle_new_user()`

---

## 4. ENVIRONMENT VARIABLES

### Variables defined in `.env.example`
- `NEXT_PUBLIC_SUPABASE_URL`
  - Use: Supabase project URL.
  - Public/server: **public** (`NEXT_PUBLIC`).
  - Referenced in: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `lib/supabase/service-role.ts`, `app/auth/callback/route.ts`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Use: Supabase anon key for browser/server auth flows.
  - Public/server: **public**.
  - Referenced in: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `app/auth/callback/route.ts`.
- `SUPABASE_SERVICE_ROLE_KEY`
  - Use: privileged service role for reminder scanning route.
  - Public/server: **server-only**.
  - Referenced in: `lib/supabase/service-role.ts`.
- `GEMINI_API_KEY`
  - Use: Gemini provider auth.
  - Public/server: **server-only**.
  - Referenced in: `app/api/generate-schedule/route.ts`, `lib/gemini.ts`.
- `GEMINI_MODEL`
  - Use: Gemini model override.
  - Public/server: **server-only**.
  - Referenced in: `app/api/generate-schedule/route.ts`, `lib/gemini.ts`.
- `OPENROUTER_API_KEY`
  - Use: OpenRouter fallback provider auth.
  - Public/server: **server-only**.
  - Referenced in: `app/api/generate-schedule/route.ts`, `lib/gemini.ts`.
- `OPENROUTER_MODEL`
  - Use: OpenRouter model override (free model expected).
  - Public/server: **server-only**.
  - Referenced in: `lib/gemini.ts`.
- `GROQ_API_KEY`
  - Use: Groq fallback provider auth.
  - Public/server: **server-only**.
  - Referenced in: `app/api/generate-schedule/route.ts`, `lib/gemini.ts`.
- `GROQ_MODEL`
  - Use: Groq model override.
  - Public/server: **server-only**.
  - Referenced in: `lib/gemini.ts`.
- `LLM_PROVIDER_TIMEOUT_MS`
  - Use: configurable provider timeout in shared `lib/gemini.ts` helper.
  - Public/server: **server-only**.
  - Referenced in: `lib/gemini.ts`.
- `FREE_DAILY_GENERATION_LIMIT`
  - Use: per-day generation hard cap.
  - Public/server: **server-only**.
  - Referenced in: `app/api/generate-schedule/route.ts`.
- `TELEGRAM_BOT_TOKEN`
  - Use: Telegram bot API token.
  - Public/server: **server-only**.
  - Referenced in: `lib/telegram.ts`, `app/api/send-alerts/route.ts`.
- `NEXT_PUBLIC_APP_URL`
  - Use: base URL used in signup callback URL.
  - Public/server: **public**.
  - Referenced in: `app/signup/signup-form.tsx`.
- `CRON_SECRET`
  - Use: authorization secret for `/api/send-alerts`.
  - Public/server: **server-only**.
  - Referenced in: `app/api/send-alerts/route.ts`.

### `.env.local`
- Contains all above keys populated for local testing.
- Current file includes real secrets/tokens; treat as sensitive and never commit.

---

## 5. EVERY API ROUTE (FULL DETAIL)

### `app/api/generate-schedule/route.ts`
- Methods: `POST`
- Auth check:
  - Uses `createClient()` and `supabase.auth.getUser()`.
  - Returns `401 { error: "Unauthorized" }` if no user.
- Logic flow:
  1. Parse JSON body (`schedule_date?`, `day_plan?`), default `{}` on parse failure.
  2. Load profile timezone from `profiles` by current user.
  3. Compute `scheduleDate` from body or timezone-based today.
  4. Enforce `FREE_DAILY_GENERATION_LIMIT`:
     - Read `ai_usage_limits` for user/date.
     - If table missing (code `42P01`), disables usage-limit path gracefully.
     - If used >= limit -> `429`.
  5. If `day_plan` exists:
     - Run deterministic `generateTasksFromDayPlan()`.
     - On validation error -> `400`.
  6. Else (AI path):
     - Fetch `constraints` via `.single()`.
     - If missing constraints (`PGRST116`) -> clear `400` asking user to save constraints first.
     - Parse fixed schedule/life vars.
     - Build strict prompt via `buildScheduleGenerationPrompt`.
     - Provider chain:
       - Gemini first (25s timeout)
       - OpenRouter next (20s timeout)
       - Groq last (20s timeout)
     - For each provider:
       - Request text
       - Parse JSON (`extractJsonArrayFromModelText`)
       - Validate (`parseAndValidateGeneratedTasks`)
       - Additional route-level validation:
         - at least 5 blocks
         - first block start <= 01:00
         - last block end >= 22:00
         - no non-positive durations
         - no overlaps
       - If initial parse fails, run provider-specific JSON repair prompt and retry parse/validate.
       - Logs provider success duration (`console.log`).
     - If no provider yields valid output -> `400` unavailable providers message.
  7. Delete existing tasks for user/date.
  8. Insert new tasks.
  9. Upsert usage count (if usage limit enabled).
  10. Return success payload.
- Success response:
  - `200 { ok: true, schedule_date, count }`
- Error responses:
  - `401` unauthorized
  - `400` profile missing / invalid day plan / constraints missing / all AI providers unavailable
  - `429` daily limit reached
  - `500` env/config/db errors
- External services used:
  - Supabase (auth/profile/constraints/tasks/usage table)
  - Gemini API (`@google/generative-ai`)
  - OpenRouter API (`fetch`)
  - Groq API (`groq-sdk`)
- Timeout/fallback logic:
  - Explicit `withTimeout` + provider-specific timeout durations and sequential failover.

### `app/api/tasks/route.ts`
- Methods: `GET`, `DELETE`
- Auth check:
  - `supabase.auth.getUser()` required.
  - `401` if missing user.
- `GET` flow:
  1. Parse `schedule_date` query (`YYYY-MM-DD` required).
  2. Query `tasks` selecting `id, title, category, starts_at, ends_at, schedule_date, completed`.
  3. Filter `user_id` + `schedule_date`.
  4. Order by `starts_at ASC`.
  5. Return tasks.
- `DELETE` flow:
  1. Parse `schedule_date`.
  2. Delete tasks for `user_id` + `schedule_date`.
  3. Return ok.
- Success responses:
  - GET: `200 { ok: true, tasks: [...] }`
  - DELETE: `200 { ok: true }`
- Error responses:
  - `401` unauthorized
  - `400` invalid date format
  - `500` Supabase query error
- External services: Supabase only.

### `app/api/tasks/[id]/route.ts`
- Methods: `PATCH`
- Auth check:
  - Requires authenticated user (`401` if not).
- Flow:
  1. Resolve `id` from route params.
  2. Fetch task (`id,user_id,completed`) by id.
  3. If missing -> `404`.
  4. If `task.user_id !== user.id` -> `403`.
  5. Parse body (`completed?: boolean`) else `400`.
  6. Only patch `completed` (other fields ignored).
  7. Update row with `.eq("id", id).eq("user_id", user.id)`.
  8. Return updated task object.
- Success response:
  - `200 { ok: true, task: { id, title, category, starts_at, ends_at, schedule_date, completed } }`
- Error responses:
  - `401`, `403`, `404`, `400`, `500`.
- External services: Supabase only.

### `app/api/send-alerts/route.ts`
- Methods: `GET`
- Auth check:
  - Verifies `CRON_SECRET` exists.
  - Verifies header `Authorization: Bearer <CRON_SECRET>`.
  - Returns `401` immediately if missing/wrong token.
- Flow:
  1. Check `TELEGRAM_BOT_TOKEN` exists; return `500` clear message if not.
  2. Initialize service-role Supabase client (server-only).
  3. Compute `now`, `now+15m`, and `schedule_date=today`.
  4. Query `tasks` for:
     - `schedule_date == today`
     - `starts_at >= now && <= in15`
     - `alert_sent_at is null`
  5. Get `profiles` for candidate user IDs with non-null `telegram_chat_id`.
  6. For each candidate task:
     - If no chat id -> skip.
     - Try send Telegram message.
     - On success, set `alert_sent_at = now`.
     - On per-task failure, store error and continue loop.
  7. Return summary object.
- Success response:
  - `200 { ok, sent, candidates, errors? }`
  - when none due: `200 { ok: true, sent: 0 }`
- Error responses:
  - `401` unauthorized cron caller
  - `500` CRON secret missing, Telegram token missing, service-role misconfigured, query failures
- External services:
  - Supabase service-role
  - Telegram Bot API via `lib/telegram.ts`
- Timeout/fallback:
  - No explicit timeout wrapper; resilient via per-task try/catch so single failures do not crash batch.

### `app/auth/callback/route.ts` (auth utility route)
- Methods: `GET`
- Purpose:
  - Exchanges Supabase auth code for session and redirects.
- Flow:
  1. Parse `code`, `next`, `origin`.
  2. If `code` exists, create server Supabase client with cookie adapter.
  3. `exchangeCodeForSession(code)`.
  4. On success redirect to `${origin}${next}`; else redirect `/login?error=auth`.
- External services:
  - Supabase Auth.

---

## 6. AI GENERATION LOGIC (FULL DETAIL)

### Provider fallback chain
- Implemented in `app/api/generate-schedule/route.ts`:
  1. **Gemini**
     - Package: `@google/generative-ai`
     - Model: `process.env.GEMINI_MODEL` or default `gemini-1.5-flash`
     - Timeout: **25s**
  2. **OpenRouter**
     - Endpoint: `POST https://openrouter.ai/api/v1/chat/completions`
     - Model candidates:
       - `meta-llama/llama-3.1-8b-instruct:free`
       - `mistralai/mistral-7b-instruct:free`
       - `google/gemma-2-9b-it:free`
     - Timeout: **20s**
  3. **Groq**
     - Package: `groq-sdk`
     - Model: `llama-3.1-8b-instant`
     - Timeout: **20s**

### Prompt logic (`lib/schedule/prompt.ts`)
- Generates a strict multi-section instruction set with explicit rules:
  - Sleep block requirements.
  - Wake-up backward calculation from first class.
  - Mandatory morning sequence.
  - Mandatory commute sequence.
  - Fixed class immutability.
  - Post-class transition requirements.
  - Gym decomposition and placement constraints.
  - Meal windows and constraints.
  - Study placement and max-duration rules.
  - Evening wind-down and pre-sleep behavior.
  - Hard violations list.
  - Output contract:
    - raw JSON array only
    - sorted
    - complete day coverage without gaps
    - exact field schema.
- Context appended:
  - `schedule_date`, timezone, weekday label/index, fixed classes JSON, life variables JSON.

### JSON parsing and cleaning
- `extractJsonArrayFromModelText()` in `lib/schedule/generated-task.ts`:
  - trims text
  - if markdown fence exists, extracts fenced content
  - `JSON.parse(...)`
- On parse failure, route issues a provider-specific repair prompt (`repairJsonWithProvider`) and retries parse/validation.

### Validation logic after provider response
- Base validation (`parseAndValidateGeneratedTasks`):
  - output must be array
  - each task must have non-empty title
  - category must be exactly `class|study|life`
  - timestamps must parse as valid ISO
  - `ends_at > starts_at`
  - `schedule_date` format `YYYY-MM-DD`
  - `schedule_date` must match expected date
  - output sorted by start
  - overlap check (`curEnd > nextStart`) throws error
- Additional route-level guard (`isValidScheduleCoverage`):
  - minimum 5 blocks
  - first block start at/before 01:00
  - last block end at/after 22:00
  - every block positive duration
  - no overlaps (re-checked)

### What happens when validation fails
- Provider attempt is considered failed.
- If initial parse failed, repair pass is attempted once with same provider.
- If validation still fails, route falls through to next provider.
- If all providers fail: `400` with friendly unavailable-provider message.

### Overlap detection specifics
- In `parseAndValidateGeneratedTasks`:
  - sorts tasks by start timestamp.
  - iterates adjacent pairs.
  - if previous `ends_at` > next `starts_at` => throws overlap error.
- In route coverage check:
  - same adjacency comparison logic after parsing.

---

## 7. EVERY COMPONENT AND PAGE (FULL DETAIL)

### `app/layout.tsx`
- Renders root `<html><body>`.
- Sets metadata title/description.
- No state, no API calls.

### `app/page.tsx`
- Renders landing UI and nav links to `/login`, `/signup`, `/dashboard`.
- No state/API.

### `app/login/page.tsx`
- Renders `LoginForm` inside `Suspense` with pulse fallback skeleton.
- No own state/API.

### `app/login/login-form.tsx`
- Renders email/password login form.
- State:
  - `email`, `password`, `error`, `loading`.
- Behavior:
  - on submit: `supabase.auth.signInWithPassword` with 10s timeout.
  - on success: `router.replace(next || "/dashboard")`, then refresh.
  - spinner and disabled button while loading.
  - friendly timeout/network errors.

### `app/signup/page.tsx`
- Wrapper page rendering `SignupForm`.

### `app/signup/signup-form.tsx`
- Renders full_name/email/password signup form.
- State:
  - `fullName`, `email`, `password`, `error`, `info`, `loading`.
- Behavior:
  - generates callback URL (`window.origin` on client, fallback to `NEXT_PUBLIC_APP_URL`).
  - on submit: `supabase.auth.signUp` with metadata and 10s timeout.
  - if session returned: replace to `/dashboard`.
  - else show email confirmation message.
  - spinner + disabled button.

### `app/auth/callback/route.ts`
- Not a UI component; handles Supabase auth callback and redirects.

### `app/dashboard/page.tsx`
- Server component shell:
  - gets user and profile (`full_name, timezone, telegram_chat_id`).
  - redirects unauthenticated/missing-profile users to login.
  - passes props to `DashboardClient`.

### `app/dashboard/dashboard-client.tsx`
- Main dashboard render:
  - header + user metadata
  - `LogoutButton`
  - New Routine trigger + Delete Today's Plan
  - generation status/errors + last generated label
  - progress bar widget
  - timeline (skeleton/empty/tasks)
  - Telegram chat ID save form
  - nav links
  - `NewRoutineModal`
- State:
  - tasks, loading/error states for tasks generation/deletion/toggle/telegram
  - modal open
  - last generated timestamp
  - cached keys by schedule date
- API calls:
  - `GET /api/tasks` on mount/date change (with sessionStorage cache)
  - `POST /api/generate-schedule` on generate
  - `DELETE /api/tasks` on delete plan
  - `PATCH /api/tasks/[id]` on checkbox toggle
  - direct Supabase update of `profiles.telegram_chat_id`
- Special UI:
  - generate button pulse + disabled lock
  - 4 pulsing skeleton cards while tasks load
  - category color mapping:
    - class: purple
    - study: teal
    - life: green
  - empty-state card with arrow + guidance
  - optimistic toggle with revert + toast text
  - timeout handling for generate API (30s)

### `app/dashboard/logout-button.tsx`
- Client sign-out button.
- State: `loading`, `error`.
- Behavior: Supabase signOut then route to `/login`.

### `app/dashboard/error.tsx`
- Dashboard error boundary fallback UI.
- Props: `error`, `reset`.
- Renders friendly card + Retry button.

### `app/dashboard/constraints/page.tsx`
- Server page:
  - auth check.
  - loads constraint row if exists.
  - parses to initial form data.
  - renders `ConstraintsForm`.

### `app/dashboard/constraints/constraints-form.tsx`
- Client form for fixed schedule + life variables.
- Props:
  - `initialClasses: FixedClassSlot[]`
  - `initialLife: LifeVariables`
- State:
  - classes, life, error, saved, loading.
- API:
  - uses browser Supabase to `upsert` into `constraints` with `onConflict: user_id`.
- Validation:
  - each class `start < end`
  - numbers clamped non-negative
  - auth presence check before save.
- UX:
  - add/remove class rows
  - reset to last saved.

### `app/dashboard/new-routine-modal.tsx`
- Client modal for explicit day-event planning.
- Props:
  - `open`, `defaultDate`, `onClose`, `onSubmit`, `loading`, `error`
- Manages state for:
  - date
  - classes (title/start/end/campus)
  - activities including `other` + custom label
  - meals (breakfast/lunch/dinner toggles + times)
  - travel matrix
  - multi-campus details and transfer time
  - wake/sleep windows
  - local template save/load (localStorage)
- Validation:
  - per-row time validity
  - overlap detection
  - required campus when multi-campus enabled
  - required custom title for `other`
  - wake/sleep logical consistency.
- Emits `DayPlanInput` to parent on submit.

### API route files in `app/api/*`
- Covered in Section 5.

---

## 8. AUTHENTICATION FLOW (STEP BY STEP)

### Signup flow
1. User opens `/signup` and submits `fullName`, `email`, `password`.
2. `SignupForm` calls `supabase.auth.signUp` with:
   - email/password
   - `options.emailRedirectTo` to `/auth/callback?next=/dashboard`
   - user metadata `{ full_name }`.
3. Supabase creates `auth.users` record.
4. DB trigger `on_auth_user_created` executes `public.handle_new_user()` and inserts `public.profiles` row automatically.
5. If Supabase returns immediate session, app `router.replace("/dashboard")`.
6. If email confirmation required, user sees info message and confirms email.
7. Callback endpoint `/auth/callback` exchanges code for session and redirects to dashboard path.

### Login flow
1. User opens `/login` and submits email/password.
2. `LoginForm` calls `supabase.auth.signInWithPassword` with 10s timeout.
3. On success, app `router.replace(next || "/dashboard")`.
4. Supabase session cookie is available for server-side checks.

### Middleware protection and session refresh
- Global `middleware.ts`:
  - first skips static/internal routes (`/_next`, `/favicon`, `/public`, extension-based files).
  - for remaining routes, delegates to `lib/supabase/middleware.updateSession`.
- `updateSession`:
  - creates server client bound to request/response cookies.
  - calls `supabase.auth.getUser()` to refresh/auth-check.
  - redirects:
    - unauthenticated `/dashboard*` -> `/login?next=...`
    - authenticated `/login` or `/signup` -> `/dashboard`.

### Session expiration behavior
- API routes return `401` when user missing.
- Dashboard client maps `401` to session-expired friendly message and redirects to login for relevant actions.

---

## 9. CONSTRAINT FORM LOGIC

### Fields and types
- Fixed classes (`FixedClassSlot[]`):
  - `title: string`
  - `weekday: number` (`0..6`)
  - `start: string` (`HH:MM`)
  - `end: string` (`HH:MM`)
- Life variables (`LifeVariables`):
  - `commute_minutes: number`
  - `sleep_hours: number`
  - `gym_minutes: number`
  - `meal_break_minutes: number`

### Validation
- class rows with blank title are dropped before save.
- time normalization to `HH:MM`.
- each saved class must satisfy `start < end`.
- life variable numbers coerced and clamped to non-negative.

### JSONB shapes in Supabase
- `constraints.fixed_schedule` example:
```json
[
  {
    "title": "Calculus",
    "weekday": 1,
    "start": "09:00",
    "end": "10:30"
  }
]
```
- `constraints.life_variables` example:
```json
{
  "commute_minutes": 30,
  "sleep_hours": 8,
  "gym_minutes": 45,
  "meal_break_minutes": 30
}
```

### Upsert behavior
- Form writes:
  - `user_id`
  - `fixed_schedule`
  - `life_variables`
- Uses `.upsert(..., { onConflict: "user_id" })`, so one row per user is created or updated.

### Pre-population logic
- `constraints/page.tsx` fetches current row with `.maybeSingle()`.
- Uses parsers:
  - `initialRowsFromDb(row.fixed_schedule)` for classes.
  - `parseLifeVariables(row.life_variables)` for life values.
- Form receives initial props and displays previous saved values.

---

## 10. DASHBOARD LOGIC (FULL DETAIL)

### Task fetching and ordering
- Triggered client-side in `DashboardClient` on `scheduleDate`.
- `GET /api/tasks?schedule_date=...`.
- API query explicitly selects:
  - `id, title, category, starts_at, ends_at, schedule_date, completed`
- API applies `.order("starts_at", { ascending: true })`.
- Client still normalizes/sorts defensively.

### Progress percentage
- Computed from local `tasks` state:
  - `done = tasks.filter(t => t.completed).length`
  - `Math.round((done / tasks.length) * 100)` with zero guard.

### Optimistic checkbox behavior
- On toggle:
  1. immediately flips `completed` in local state.
  2. sends `PATCH /api/tasks/[id]`.
  3. if request fails, reverts to prior state.

### Revert on failure + message
- On non-OK or catch:
  - restores original task completion state.
  - sets `toggleError = "Could not save - please try again"`.

### Skeleton loader
- While `tasksLoading` true:
  - shows 4 pulsing placeholder cards (`animate-pulse`) in timeline area.

### Category color mapping
- `class` -> `border-purple-400 bg-purple-200/90 text-purple-950`
- `study` -> `border-teal-400 bg-teal-200/80 text-teal-950`
- `life` -> `border-emerald-400 bg-emerald-200/80 text-emerald-950`

### Empty state behavior
- If tasks loaded and empty:
  - displays dashed card with upward arrow and text:
    - "No routine yet - click Generate My Routine to build your day"

### Last generated timestamp
- Stored in `sessionStorage` key: `last-generated-${scheduleDate}`.
- After successful generation:
  - sets current local time string (`HH:MM` locale format).
  - rendered below generate controls as `Last generated: ...`.

### Session cache for tasks
- Uses `sessionStorage` key: `tasks-${scheduleDate}`.
- If cache exists and not forced, avoids fetch and hydrates tasks from cache.
- Cache invalidated on delete plan and forced reload on generate success.

---

## 11. TELEGRAM ALERT SYSTEM

### Bot token usage
- `lib/telegram.ts` builds URL:
  - `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
- Sends JSON body:
  - `chat_id`, `text`, `disable_web_page_preview: true`

### `send-alerts` route logic
1. Validate `CRON_SECRET` exists.
2. Validate `Authorization` header exactly `Bearer <CRON_SECRET>`.
3. Validate `TELEGRAM_BOT_TOKEN` set.
4. Create Supabase service-role client.
5. Query tasks for:
   - today’s `schedule_date`
   - start in `[now, now+15m]`
   - `alert_sent_at is null`.
6. Fetch profile chat IDs for candidate users.
7. Per task:
   - skip if no chat ID.
   - send Telegram reminder text.
   - update task `alert_sent_at` on success.
   - if send/update fails, record error and continue.
8. Return summary counts and optional errors list.

### Duplicate prevention
- `alert_sent_at` is null-filtered in candidate query.
- After successful send it is set, preventing future duplicate sends for same task.

### cron-job.org setup pattern
- Configure recurring job (commonly every 5 minutes) calling:
  - `GET https://<your-domain>/api/send-alerts`
- Include header:
  - `Authorization: Bearer <CRON_SECRET>`

### User chat ID linking
- Dashboard Telegram section allows saving numeric chat ID to `profiles.telegram_chat_id`.
- Input sanitizes non-digits and validates with explicit numeric rule.

---

## 12. PERFORMANCE OPTIMIZATIONS APPLIED

- Supabase browser singleton in `lib/supabase/client.ts` (`browserClient` memoized).
- Server client creation wrapped with `cache()` in `lib/supabase/server.ts`.
- Middleware skip-first strategy for static/internal/extension routes.
- Dashboard shell split from task timeline (server shell + client task loading).
- Task skeleton loader (4 pulse cards) during fetch.
- Client task response caching via `sessionStorage`.
- Generate button hard lock (disabled), pulse label, and timeout safety.
- Generate API timeout/failover:
  - Gemini 25s, OpenRouter 20s, Groq 20s.
- Query optimization:
  - explicit task column select
  - ordered query in DB
  - send-alerts filter includes `schedule_date` first.
- Added dashboard error boundary (`app/dashboard/error.tsx`) for graceful crash recovery.

---

## 13. BUGS FOUND AND FIXED

### 1) Next build cache module errors
- Bug: `Cannot find module './447.js'` and webpack runtime issues.
- Cause: stale/corrupted `.next` build artifacts.
- Fix: clear/rebuild workflow and restart dev server.
- Files changed: none (runtime cleanup action).

### 2) Gemini model not found / quota failures
- Bug: provider 404/429 from Gemini.
- Cause: unavailable model/quota exhaustion on configured key.
- Fix:
  - multi-provider fallback path (Gemini -> OpenRouter -> Groq),
  - strict provider timeouts,
  - free-tier model candidates,
  - friendly all-provider-failed behavior.
- Files changed:
  - `app/api/generate-schedule/route.ts`
  - `lib/gemini.ts`
  - `.env.example`

### 3) Malformed LLM JSON responses
- Bug: parse errors (e.g., unterminated strings).
- Cause: LLM occasionally returns broken JSON.
- Fix: repair pass per-provider using JSON-repair prompt and re-validation.
- Files changed:
  - `app/api/generate-schedule/route.ts`
  - `lib/schedule/generated-task.ts`

### 4) Hydration mismatch (`fdprocessedid`)
- Bug: dashboard hydration mismatch due to injected attributes.
- Cause: browser extension mutating DOM before hydration.
- Fix: `suppressHydrationWarning` on interactive inputs/buttons.
- Files changed:
  - `app/dashboard/dashboard-client.tsx`
  - `app/dashboard/logout-button.tsx`

### 5) Auth UX latency/no feedback
- Bug: login/signup felt slow and gave little immediate feedback.
- Cause: no timeout guard and limited loading indicators.
- Fix:
  - 10s auth timeout,
  - spinner + disabled buttons,
  - `router.replace` to avoid stale login in back stack.
- Files changed:
  - `app/login/login-form.tsx`
  - `app/signup/signup-form.tsx`

### 6) Dashboard fetch/render sluggishness
- Bug: heavy perceived load and full-page-like waits.
- Cause: timeline tied to immediate fetch without shell-first behavior/cache/skeleton.
- Fix:
  - shell-first page structure,
  - skeleton cards,
  - session cache and task force-refresh only when needed.
- Files changed:
  - `app/dashboard/page.tsx`
  - `app/dashboard/dashboard-client.tsx`

### 7) API hardening gaps
- Bug: weaker constraints pre-check/provider guardrails.
- Cause: generation accepted some invalid outputs and had less strict early errors.
- Fix:
  - required constraints pre-check with clear 400,
  - stronger block coverage/duration/overlap constraints,
  - provider duration logging.
- Files changed:
  - `app/api/generate-schedule/route.ts`

---

## 14. KNOWN ISSUES AND INCOMPLETE WORK

- `lib/gemini.ts` exists as alternate helper; primary generation route currently implements provider logic inline, so there is duplicated provider-related logic.
- `components/` and `public/` folders are present but empty (structure reserved).
- Telegram path depends on correct external bot/chat setup; no end-to-end integration test file is present.
- No automated test suite currently in repo (no unit/integration specs).
- Dashboard uses inline text toast for checkbox failure; no dedicated toast system component.
- `README.md` is missing (project documentation is currently in handoff/status markdown files).
- Deployment-specific setup (Vercel env + cron-job.org job) is operationally documented but not codified as infrastructure config.

---

## 15. EXACT COMMANDS TO RUN THE PROJECT

### Prerequisites
- Node.js + npm installed.
- Supabase project created and migrations applied.
- `.env.local` populated.

### Install
```bash
npm install
```

### Development run
```bash
npm run dev
```

### Production build
```bash
npm run build
```

### Production start (after build)
```bash
npm run start
```

### Lint
```bash
npm run lint
```

### Required environment setup before running
1. Copy `.env.example` keys into `.env.local`.
2. Fill at minimum:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. For full feature set also fill:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY` (+ optional model)
   - `OPENROUTER_API_KEY`
   - `GROQ_API_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `CRON_SECRET`
   - `NEXT_PUBLIC_APP_URL`
4. Apply SQL migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_ai_usage_limits.sql`

---

## 16. THIRD PARTY SERVICE SETUP STATUS

### Supabase
- Status: **set up and integrated**.
- Applied:
  - Auth + DB schema + RLS + triggers + constraints/tasks/profiles/usage tables.
- Still required:
  - Ensure migrations are applied in the exact target environment (if moving projects).

### Gemini
- Status: **integrated in code**, key required per environment.
- Applied:
  - Provider call in generate route with timeout and fallback behavior.
- Still required:
  - Valid key/model quota in deployed env.

### OpenRouter
- Status: **integrated fallback path**.
- Applied:
  - free model candidates and API call path in generate route.
- Still required:
  - `OPENROUTER_API_KEY` in env.

### Groq
- Status: **integrated fallback path**.
- Applied:
  - `groq-sdk` use in generate route.
- Still required:
  - `GROQ_API_KEY` in env.

### Telegram
- Status: **integrated**.
- Applied:
  - token usage helper + send-alerts route + profile chat ID save UI.
- Still required:
  - bot creation and valid `TELEGRAM_BOT_TOKEN`.
  - users must provide `telegram_chat_id`.

### cron-job.org
- Status: **external dependency planned/expected**.
- Applied:
  - secured endpoint `/api/send-alerts` with bearer secret.
- Still required:
  - create cron job hitting endpoint with `Authorization: Bearer <CRON_SECRET>`.

### Vercel
- Status: **not codified in repo, deployment-ready app**.
- Applied:
  - Next.js app compatible with Vercel runtime.
- Still required:
  - project import/deploy,
  - env var configuration in Vercel dashboard,
  - domain and cron target finalization.

---

## BUILD/LINT VERIFICATION SNAPSHOT
- `npm run lint` -> passed
- `npm run build` -> passed

