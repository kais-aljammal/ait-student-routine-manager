# Deployment (Vercel)

## Environment variables (Production)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; used by cron and Telegram webhook |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://your-app.vercel.app` (HTTPS, not localhost) |
| `CRON_SECRET` | Yes | Random string; Vercel cron sends `Authorization: Bearer` with this value |
| `TELEGRAM_BOT_TOKEN` | For reminders | From @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Production connect | Random string; required when app URL is public HTTPS |
| `TELEGRAM_BOT_USERNAME` | Optional | Bot @handle without `@`; otherwise resolved via `getMe` |
| AI keys | For generation | `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, and/or fallbacks — see `.env.example` |

Redeploy after changing environment variables.

## Database

Apply SQL migrations in order under `supabase/migrations/` (Supabase SQL editor or CLI).

## Telegram reminders

1. User connects in **Settings → Telegram** (webhook must reach `/api/telegram/webhook`).
2. `vercel.json` invokes `/api/send-alerts` every five minutes.
3. Tasks starting within the next 15 minutes get one message; `alert_sent_at` prevents duplicates.

### Verify cron

```powershell
.\scripts\test-send-alerts.ps1 -BaseUrl "https://your-app.vercel.app"
```

Expect JSON such as `{"ok":true,"sent":0}` — not `Unauthorized` or HTML.

In Vercel: **Project → Cron Jobs** should list `/api/send-alerts` after deploy.
