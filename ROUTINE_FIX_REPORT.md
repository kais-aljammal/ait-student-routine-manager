# Routine.ai Fix Report

**Date:** 2026-05-19  
**Scope:** UI branding, timezone/region, location settings, Telegram audit & fixes

---

## 1. Summary

- **Branding:** Added shared `BrandLogo` component so the header reads **Routine.ai** with no visual gap; cyan `.ai` suffix preserved.
- **Timezone:** Fixed stale **Asia/Riyadh** (and similar) by preferring device timezone unless the user explicitly sets **manual** in Settings; auto-syncs profile when browser TZ differs.
- **Location:** Settings now supports device TZ, geolocation → timezone (timeapi.io), approximate IP lookup, manual IANA entry, optional city/country — stored on `profiles`.
- **Telegram:** Added one-tap **Connect Telegram** (deep link + webhook), disconnect, local-time reminder copy, and clearer connected/not-connected UI. Manual chat ID fallback kept.

**Apply migration before deploy:** `supabase/migrations/004_profile_location.sql`

---

## 2. UI — ".ai" gap

### Cause
The logo used adjacent JSX text + `<span>` inside a flex container (`flex items-center gap-2`). React preserved whitespace/newlines between `Routine` and `<span>`, and flex layout could add perceived spacing. Same pattern on login/signup links.

### Fix
- New component: `components/brand-logo.tsx`
- Two inline spans with **no whitespace between them**: `Routine` + `.ai` (cyan)
- Uses `inline-flex items-baseline whitespace-nowrap` — no flex `gap` on the word itself
- Wired in: `app/dashboard/dashboard-client.tsx`, `app/login/page.tsx`, `app/signup/page.tsx`

---

## 3. Timezone / region — Asia/Riyadh root cause

### Root cause
`Asia/Riyadh` was **not hardcoded** in the repo. It was saved to `profiles.timezone` at signup from `Intl.DateTimeFormat().resolvedOptions().timeZone` (browser/OS timezone at registration — e.g. user in Saudi Arabia, VPN, or system setting).

The dashboard then **always used the stored profile timezone** for display and task times. Browser fallback only ran when profile was `UTC`, so a stale auto-detected zone like `Asia/Riyadh` never updated after travel or OS change.

### New resolution order
Implemented in `lib/location/timezone.ts` → `resolveEffectiveTimeZone()`:

| Priority | Source | When used |
|----------|--------|-----------|
| 1 | **manual** | User saved timezone in Settings (`timezone_source = 'manual'`) |
| 2 | **browser** | `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| 3 | **profile fallback** | Stored IANA string if browser unavailable |
| 4 | **UTC** | Last resort |

When browser TZ ≠ profile TZ and source is not `manual`, the dashboard **auto-persists** browser timezone via `PATCH /api/profile/location` (`timezone_source: 'browser'`).

Header now shows: `YYYY-MM-DD · Europe/London (BST)` via `formatTimezoneDisplay()`.

---

## 4. Location feature

### What was built
| Piece | Path |
|-------|------|
| Timezone utilities | `lib/location/timezone.ts` |
| Profile PATCH API | `app/api/profile/location/route.ts` |
| Detect TZ (IP / coords) | `app/api/profile/detect-timezone/route.ts` |
| Settings UI | `app/dashboard/dashboard-settings.tsx` |
| DB migration | `supabase/migrations/004_profile_location.sql` |

### Detection order (Settings)
1. **Manual** — IANA text field + Save (`timezone_source: manual`)
2. **Use device timezone** — browser `Intl`
3. **Use my location** — `navigator.geolocation` → `/api/profile/detect-timezone?lat=&lon=` → [timeapi.io coordinate API](https://timeapi.io/)
4. **Approximate (IP)** — `/api/profile/detect-timezone` → timeapi.io IP endpoint (labeled approximate in UI)

### Stored fields (`profiles`)
- `timezone` (existing)
- `timezone_source` — `manual | browser | geolocation | ip | signup`
- `locale`, `city`, `country_code` (optional)
- `telegram_link_token`, `telegram_link_expires_at` (Telegram connect flow)

### Privacy
- Copy in Settings explains timezone use; geolocation is **opt-in** via button
- App works fully if location denied — falls back to browser or manual entry
- No background tracking

### Used for
- Dashboard date line & task time labels (`effectiveTimeZone`)
- Schedule generation (`profiles.timezone` after sync — `app/api/generate-schedule/route.ts`)
- Telegram reminder text with local start time (`app/api/send-alerts/route.ts`)

---

## 5. Telegram audit

### Architecture (text diagram)

```
User → Settings → POST /api/telegram/link
                      ↓
              t.me/{BOT}?start=link_{token}
                      ↓
         User taps Start in Telegram
                      ↓
    Telegram → POST /api/telegram/webhook
                      ↓
    Service role: match token → save telegram_chat_id
                      ↓
    Cron (every ~5 min) → GET/POST /api/send-alerts
                      ↓
    Query tasks starting in 15 min → sendTelegramMessage()
```

### Before this work
| Item | Status |
|------|--------|
| Settings entry | ✅ Manual chat ID only |
| Bot deep link / webhook | ❌ Missing |
| `telegram_chat_id` save | ✅ Manual via Supabase client |
| Reminder cron | ✅ `/api/send-alerts` + `CRON_SECRET` |
| Connected UI | ⚠️ Only reflected after manual save |
| Local time in reminders | ❌ Generic "in 15 minutes" only |
| Error surfacing | ⚠️ Save errors only in modal |

### After this work
| Item | Status |
|------|--------|
| One-tap Connect | ✅ `POST /api/telegram/link` + deep link |
| Webhook handler | ✅ `POST /api/telegram/webhook` |
| Disconnect | ✅ `DELETE /api/telegram/link` |
| Manual chat ID | ✅ Still supported |
| Local time in message | ✅ Uses profile timezone |
| Logging | ✅ JSON logs on link + send failures |

### Required env vars (see `.env.example`)
```bash
TELEGRAM_BOT_TOKEN=          # from @BotFather
TELEGRAM_BOT_USERNAME=       # bot handle without @
TELEGRAM_WEBHOOK_SECRET=     # optional; match BotFather setWebhook secret
CRON_SECRET=                 # for /api/send-alerts
```

### Webhook setup (production)
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://<YOUR_APP>/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

### Manual test — Telegram
1. Set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_BOT_USERNAME` in `.env.local`
2. Register webhook (above)
3. Sign in → Settings → **Connect Telegram** → Start in bot
4. Header should show **connected** (refresh if needed)
5. Create a task starting ~15 min from now; trigger cron:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://localhost:3000/api/send-alerts
   ```
6. **Disconnect Telegram** → header shows not connected

---

## 6. Bugs & risks found

| Severity | Issue | Location | Notes |
|----------|-------|----------|-------|
| **Critical** | Migration 004 required for new columns | `004_profile_location.sql` | Dashboard/profile APIs fail until applied |
| **High** | No webhook = Connect button fails silently for users | Ops / `.env` | UI shows error if `TELEGRAM_BOT_USERNAME` missing |
| **High** | Cron must run every ~5 min | External cron | Missed window if cron sparse |
| **Medium** | Stale TZ until page load if user travels | `dashboard-client.tsx` | Fixed on visit unless `manual`; no live TZ watcher |
| **Medium** | IP geolocation approximate | `detect-timezone/route.ts` | Labeled in UI |
| **Medium** | Missing `lib/supabase/config.ts` broke build | Fixed in this pass | Was referenced but absent |
| **Low** | Connect state not polled live | Settings | User may need refresh after bot Start |
| **Low** | timeapi.io external dependency | detect-timezone | Graceful error if API down |

---

## 7. Suggestions (follow-ups)

- **Poll profile** after Telegram link open (every 3s for 60s) to flip UI to connected without refresh
- **E2E tests** for Settings timezone + Telegram link token expiry
- **DST / travel:** optional `timezonechange` event listener to re-run browser detection
- **Multi-device:** manual timezone is source of truth; document that behavior
- **Monitoring:** alert on `send-alerts` `errors` array or `TELEGRAM_SEND_FAILED` logs
- **Bot commands:** `/status`, `/disconnect` in webhook for power users

---

## 8. Manual test checklist

### Branding
- [ ] Dashboard header shows **Routine.ai** with no space before `.ai`
- [ ] Login / signup logos match
- [ ] Mobile width: logo stays on one line

### Timezone
- [ ] Header date uses your **device** timezone (not Asia/Riyadh if you're elsewhere)
- [ ] Settings → **Use device timezone** updates header
- [ ] Settings → enter `Europe/Berlin` + Save → header shows Berlin (manual sticks after reload)
- [ ] Deny geolocation → fallback buttons still work

### Location
- [ ] **Use my location** (allow permission) → timezone updates
- [ ] **Approximate (IP)** → shows approximate message
- [ ] Optional city/country save and appear under name in header

### Telegram
- [ ] Not connected → Settings → Connect → bot Start → connected after refresh
- [ ] Manual chat ID save works
- [ ] Disconnect clears connected state
- [ ] Missing bot env shows clear error in Settings

### Regression
- [ ] Generate schedule for today/tomorrow still works
- [ ] Task times match selected timezone
- [ ] `npm test` and `npm run build` pass

---

## Files changed (reference)

| Area | Files |
|------|-------|
| Branding | `components/brand-logo.tsx`, login/signup pages, dashboard header |
| Timezone | `lib/location/timezone.ts`, `lib/date.ts`, `dashboard-client.tsx` |
| Location API | `app/api/profile/location/route.ts`, `app/api/profile/detect-timezone/route.ts` |
| Telegram | `app/api/telegram/link/route.ts`, `app/api/telegram/webhook/route.ts`, `lib/telegram.ts`, `send-alerts/route.ts` |
| Settings UI | `app/dashboard/dashboard-settings.tsx` |
| DB | `supabase/migrations/004_profile_location.sql` |
| Config | `.env.example`, `lib/supabase/config.ts` (build fix) |
| Tests | `lib/location/timezone.test.ts` |
