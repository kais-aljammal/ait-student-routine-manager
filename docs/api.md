# API routes

All authenticated routes require a valid Supabase session cookie unless noted.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/constraints` | Load saved life variables and fixed schedule |
| GET, DELETE | `/api/tasks?date=YYYY-MM-DD` | List or clear tasks for a schedule date |
| PATCH | `/api/tasks/[id]` | Toggle task completion |
| POST | `/api/generate-schedule` | Generate or rebuild tasks for a date |
| PATCH | `/api/profile/location` | Update timezone and location fields |
| GET | `/api/profile/detect-timezone` | Approximate timezone from request IP |
| POST, DELETE | `/api/telegram/link` | Create connect link or disconnect Telegram |
| GET | `/api/telegram/status` | Whether `telegram_chat_id` is set |
| POST | `/api/telegram/webhook` | Telegram Bot API webhook (link flow) |
| GET, POST | `/api/send-alerts` | Cron: send 15-minute Telegram reminders (`Authorization: Bearer CRON_SECRET`) |

Server errors return a generic message; details are logged with a route label and error code.
