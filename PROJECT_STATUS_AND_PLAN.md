# AI Student Routine Manager — Work Log & Plan

This document summarizes what has been built so far, the agreed architecture, database design, environment setup, and the remaining roadmap (per the course PRD).

---

## 1. Product goal (PRD recap)

Students enter **fixed classes** and **life constraints** (commute, sleep, etc.). A **Next.js API route** loads that data, calls **Google Gemini** with a strict JSON prompt, writes **time blocks** to Supabase, and the UI shows a **vertical timeline** (purple = class, teal = study, green = life) with **completion checkboxes** and a **progress percentage**. **Telegram** sends a reminder about **15 minutes before** a block starts. **No** mobile app, no calendar sync, no payments, no no-code tools.

---

## 2. Architecture (agreed constraints)

| Area | Choice |
|------|--------|
| Framework | Next.js (App Router) — UI + Route Handlers |
| Styling | Tailwind CSS |
| Data & auth | Supabase (Postgres + Auth + RLS) |
| Hosting | Vercel (Hobby / free tier) |
| AI | **Google Gemini** via `@google/generative-ai`, default model **`gemini-1.5-flash`** (free tier via AI Studio where applicable) |
| Scheduled alerts | **Not** Vercel Cron (paid for frequent schedules). Public **`/api/send-alerts`** hit by **[cron-job.org](https://cron-job.org)** every **5 minutes** (free external cron). |
| Cost | Supabase free tier, Vercel Hobby, Gemini/Telegram/cron free tiers — stay within documented limits. |

**Security note:** `/api/send-alerts` must verify a shared secret (e.g. `Authorization: Bearer <CRON_SECRET>`) so random visitors cannot trigger Telegram sends.

---

## 3. Work completed (repository)

### 3.1 Scaffold (Next.js + TypeScript + Tailwind)

Equivalent to a **`create-next-app`**-style layout (manual scaffold where `npx` was unavailable in the original agent environment). Includes:

- **App Router:** `app/layout.tsx`, `app/page.tsx` (placeholder copy only — no product features).
- **Tailwind v3:** `app/globals.css`, `tailwind.config.ts`, `postcss.config.mjs`.
- **Tooling:** `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `eslint.config.mjs`, `.gitignore`.

### 3.2 Dependencies declared in `package.json`

Runtime (for upcoming features): `next`, `react`, `react-dom`, `@supabase/supabase-js`, `@supabase/ssr`, `@google/generative-ai`.  
Dev: TypeScript, ESLint + `eslint-config-next`, Tailwind, PostCSS, Autoprefixer.

**You must run locally:** `npm install` then `npm run dev`.

### 3.3 Environment templates

- **`.env.example`** — documents every variable name and purpose (no secrets).
- **`.env.local`** — created for local development; **`NEXT_PUBLIC_SUPABASE_URL`** was set to your Supabase project URL. **You must add** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and later other keys). **Do not commit** `.env.local` (it is gitignored).

### 3.4 Supabase database (SQL migration)

File: **`supabase/migrations/001_initial_schema.sql`**

**Run once** in Supabase **SQL Editor** (or via Supabase CLI linked to the project).

Includes:

- Tables: **`profiles`**, **`constraints`**, **`tasks`**
- Enum: **`task_category`**: `class` | `study` | `life`
- Trigger: **`on_auth_user_created`** → inserts **`profiles`** row when a new **`auth.users`** row is created
- **`updated_at`** triggers on `profiles` and `constraints`
- **Row Level Security (RLS)** on all three tables with policies so users only access their own rows

### 3.5 Reserved folders

- `components/` — UI building blocks (empty placeholder).
- `lib/` — shared server/client helpers (empty placeholder).
- `public/` — static assets (placeholder).

---

## 4. Database schema (summary)

### `profiles`

| Column | Purpose |
|--------|---------|
| `id` | UUID, PK, `references auth.users(id)` |
| `full_name` | Display name |
| `timezone` | IANA default `UTC` — for interpreting “today” and alert windows |
| `telegram_chat_id` | Set when user links Telegram bot |
| `created_at`, `updated_at` | Audit |

### `constraints`

One row per user (`unique(user_id)`).

| Column | Purpose |
|--------|---------|
| `fixed_schedule` | JSONB — recurring fixed blocks (shape defined in app code, e.g. weekday + start/end) |
| `life_variables` | JSONB — commute minutes, sleep hours, etc. |

### `tasks`

Generated (or mirrored) schedule blocks for the timeline and alerts.

| Column | Purpose |
|--------|---------|
| `title` | Block label |
| `category` | `class` / `study` / `life` → UI colors |
| `starts_at`, `ends_at` | `timestamptz` |
| `schedule_date` | `date` for querying “today” |
| `completed` | Checkbox state |
| `alert_sent_at` | Dedupe for “15 minutes before” Telegram send |

Indexes: by `(user_id, schedule_date)` and `(user_id, starts_at)` for dashboard and cron queries.

---

## 5. Environment variables (checklist)

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Supabase anon JWT (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Bypass RLS for `/api/send-alerts` batch scan — **never** expose to browser |
| `GEMINI_API_KEY` | Server only | Gemini API |
| `GEMINI_MODEL` | Server optional | Default `gemini-1.5-flash` |
| `TELEGRAM_BOT_TOKEN` | Server only | Bot API |
| `NEXT_PUBLIC_APP_URL` | Client/server | e.g. `http://localhost:3000` or production URL |
| `CRON_SECRET` | Server only | Shared secret for cron-job.org → `/api/send-alerts` |

---

## 6. File tree — current vs planned

### Exists today

```
ai-student-routine-manager/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx              # placeholder home
├── supabase/migrations/
│   └── 001_initial_schema.sql
├── components/               # (.gitkeep — reserved)
├── lib/                      # (.gitkeep — reserved)
├── public/                   # (.gitkeep — reserved)
├── .env.example
├── .env.local                # local only; not committed
├── .gitignore
├── eslint.config.mjs
├── next.config.ts
├── next-env.d.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

### Planned (not built yet)

| Path | Purpose |
|------|---------|
| `middleware.ts` | Supabase session refresh; protect dashboard routes |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client (cookies) |
| `lib/gemini.ts` | Gemini client + model name from env |
| `lib/telegram.ts` | Send Telegram messages |
| `lib/validations/*` | Zod (or similar) for forms + LLM JSON |
| `app/(auth)/login/page.tsx`, `signup/page.tsx` | Email/password auth UI |
| `app/dashboard/page.tsx` | Timeline + progress + generate button |
| `app/api/generate-schedule/route.ts` | POST: constraints → Gemini → validate → insert `tasks` |
| `app/api/send-alerts/route.ts` | GET/POST: verify cron secret → upcoming tasks → Telegram → `alert_sent_at` |
| `app/api/...` | Optional: PATCH task `completed` |
| `components/*` | `ConstraintForm`, `Timeline`, `TaskCard`, `ProgressWidget`, etc. |
| `types/database.ts` | Row types / generated types from Supabase |

---

## 7. Your manual checklist (outside the repo)

1. **Supabase Dashboard**
   - Create project (done if URL already set).
   - **Authentication → Providers:** enable **Email** (sign-up / sign-in).
   - **SQL Editor:** run `supabase/migrations/001_initial_schema.sql`.
   - **Project Settings → API:** copy **anon** key into `.env.local`; optionally **service_role** for future cron route.

2. **Local machine**
   - `cd ai-student-routine-manager`
   - `npm install`
   - `npm run dev`

3. **Google AI Studio** (when implementing generation)
   - Create API key → `GEMINI_API_KEY` in `.env.local`.

4. **Telegram @BotFather** (when implementing alerts)
   - Create bot → `TELEGRAM_BOT_TOKEN`.
   - Later: flow to capture user `telegram_chat_id` into `profiles`.

5. **Vercel** (when deploying)
   - Import repo; add same env vars in project settings.

6. **cron-job.org** (after `/api/send-alerts` exists and is deployed)
   - Job every 5 minutes → your production URL + `/api/send-alerts` + `Authorization: Bearer <CRON_SECRET>`.

---

## 8. Roadmap (implementation order)

Suggested order aligned with the PRD and data flow:

1. **Auth** — Supabase email/password; `middleware` + login/signup pages; ensure `profiles` row exists (trigger already handles insert on signup).
2. **Constraints UI + API** — Form writes to `constraints` (upsert one row per user).
3. **`POST /api/generate-schedule`** — Read constraints → Gemini strict JSON → validate → replace or insert `tasks` for target day(s).
4. **Dashboard** — Fetch `tasks` for selected day; vertical timeline; color by `category`; checkbox PATCH → `completed`; progress widget (% completed today).
5. **`/api/send-alerts` + Telegram** — Service role query; 15-minute window; update `alert_sent_at`; protect with `CRON_SECRET`.
6. **Deploy + cron-job.org** — Wire production URL and secret header.

---

## 9. PRD wording note

The PRD still mentions **Vercel Cron** for the alert loop. The **implemented plan** replaces that with **cron-job.org** calling **`/api/send-alerts`** every five minutes, to stay on free tiers.

---

## 10. Document maintenance

Update this file when major milestones land (auth complete, generate route live, dashboard shipped, alerts deployed). It is safe to commit to git; **never** commit real API keys or `.env.local`.
