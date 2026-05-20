# AI Student Routine Manager

Next.js app for students to build daily routines from real constraints (wake/sleep, meals, fixed classes), generate AI schedules by date, and track tasks on a timeline—with optional Telegram reminders.

## Features

- Supabase email/password auth
- Multi-step constraints onboarding
- AI schedule generation (`today`, `tomorrow`, custom `YYYY-MM-DD`)
- Dashboard timeline and task completion
- Telegram connect and ~15-minute task reminders (Vercel cron)

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- Supabase (Postgres, Auth, RLS)
- AI: Claude, Gemini, OpenRouter, Groq (fallback chain)

## Quick start

```bash
npm install
cp .env.example .env.local   # first time only; fill values in .env.local
npm run dev
```

Open `http://localhost:3000` (or the port shown in the terminal).

## Environment

| File | Role |
|------|------|
| `.env.example` | Committed template (names + comments only) |
| `.env.local` | Your secrets — **never commit** |

Minimum for local dev: Supabase URL/keys, at least one AI key, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET` (for testing alerts). See `.env.example` for the full list.

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production build locally |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (`lib/**/*.test.ts`) |
| `npm run test:alerts` | Hit `/api/send-alerts` (see `scripts/`) |

## Project layout

```
app/           Pages and API routes (App Router)
components/    Shared UI
lib/           Domain logic, Supabase helpers, AI clients
supabase/      SQL migrations
scripts/       Ops and smoke tests
docs/          Deployment and API reference
```

## Documentation

- [API routes](docs/api.md)
- [Deployment & Telegram cron](docs/deployment.md)
- [Scripts](scripts/README.md)

## Production deploy

1. Set Production env vars on Vercel (see [deployment.md](docs/deployment.md)).
2. Apply `supabase/migrations/*.sql`.
3. Merge to `main` and deploy.
4. Confirm **Cron Jobs** in Vercel and run `npm run test:alerts` against your production URL.

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| 401 on `/api/send-alerts` | `CRON_SECRET` matches on Vercel and in the request; redeploy after env changes |
| No Telegram reminders | User connected in Settings; cron running; tasks due within 15 minutes |
| 401 on tasks/generation | Signed-in session valid |
| No tasks for a date | `YYYY-MM-DD` selected; schedule generated for that date |
| AI generation fails | API keys and provider quotas |

**Auth email:** Supabase → Authentication → Email → “Confirm email” controls whether signup requires verification.

## Contributing

- Keep diffs focused; preserve `YYYY-MM-DD` for schedule dates everywhere.
- Run `npm run lint`, `npm test`, and `npm run build` before opening a PR.
- Do not commit `.env.local` or secrets.

## License

Proprietary.
