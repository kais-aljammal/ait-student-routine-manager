# AI Student Routine Manager

A Next.js app that helps students generate and track daily routines from their real constraints (wake/sleep times, meals, and fixed activities), with date-aware schedule placement and task timeline tracking.

## Features
- Email/password authentication with Supabase
- Multi-step constraints onboarding flow
- AI-assisted daily schedule generation
- Date-aware planning (`today`, `tomorrow`, custom date)
- Timeline dashboard with task completion tracking
- Regenerate and clear plan actions by selected date
- Optional Telegram chat ID settings for alert workflows

## Tech Stack
- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS
- **Backend/Data/Auth:** Supabase (Postgres + Auth)
- **AI Providers:** Claude, Gemini, OpenRouter, Groq (configurable fallbacks)

## Prerequisites
- Node.js 20+ (Node.js 22 recommended)
- npm 10+
- Supabase project (URL + keys)

## Local Setup
1. Clone the repository.
2. Install dependencies:
   - `npm install`
3. Environment variables (see below):
   - **If you already have `.env.local` with your keys, skip copying — you are done.**
   - New clones only: copy `.env.example` → `.env.local`, then fill values **in `.env.local` only**.
4. Fill required values in `.env.local` if setting up for the first time.
5. Run development server:
   - `npm run dev`
6. Open the app:
   - `http://localhost:3000` (or next available port)

## Environment Variables

| File | Purpose |
|------|---------|
| `.env.example` | Committed **template** (variable names + comments). Leave values empty. |
| `.env.local` | Your real secrets. **Next.js loads this at runtime.** Git-ignored. |

You do **not** need to fill in `.env.example` if `.env.local` is already configured — the app never reads `.env.example` when you run `npm run dev`.

Use `.env.local` for local development. Do not commit secrets.

Minimum required (example placeholders only):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_public_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key
OPENROUTER_API_KEY=your_openrouter_key
GROQ_API_KEY=your_groq_key

NEXT_PUBLIC_APP_URL=http://localhost:3000
FREE_DAILY_GENERATION_LIMIT=20
CRON_SECRET=replace_with_random_secret
```

See `.env.example` for the full list and descriptions.

## Scripts
- `npm run dev` - Start local development server
- `npm run lint` - Run ESLint
- `npm test` - Run test suite (`lib/**/*.test.ts`)
- `npm run build` - Build production bundle
- `npm run start` - Start production server (after build)

## Deployment Notes
- Set all required environment variables in your hosting platform.
- Ensure Supabase schema/migrations are applied before first deploy (including `003_profiles_insert_policy.sql` for profile self-heal on sign-in).
- Keep service-role keys server-side only.
- Verify authenticated API routes (`/api/generate-schedule`, `/api/tasks`) in staging.
- Confirm timezone/date behavior in deployed environment.

## Project Structure
- `app/` - Next.js routes, pages, API route handlers
- `components/` - Shared UI components
- `lib/` - Domain logic (date, schedule parsing/sanitizing, provider integration)
- `supabase/` - SQL migrations and Supabase-related setup
- `scripts/` - Utility scripts (docs tooling, smoke helpers)

## Troubleshooting
- **Signed up but no verification email / can sign in immediately:** In Supabase → **Authentication** → **Providers** → **Email**, check **Confirm email**. If it is **off**, Supabase returns a session on signup and the app sends you straight to the dashboard (no email). Turn **Confirm email** on for production if you require verification; configure SMTP or use Supabase’s mailer, and add your site URL under **Authentication** → **URL configuration**.
- **Port already in use:** Next.js auto-picks another port; check terminal output.
- **401 on task/generation APIs:** Ensure user is signed in and session is valid.
- **No tasks shown for selected date:** Confirm selected date format (`YYYY-MM-DD`) and that generation was run for that date.
- **Provider errors during generation:** Verify API keys and provider quotas/availability.

## Contribution Guidelines
- Keep changes focused and small.
- Avoid changing generation logic unless explicitly required.
- Preserve canonical schedule date format (`YYYY-MM-DD`) across UI/API/DB.
- Run `npm run lint`, `npm test`, and `npm run build` before PR.
- Never commit `.env.local` or secrets.

## License
Proprietary.
