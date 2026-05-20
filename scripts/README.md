# Scripts

| Script | Purpose |
|--------|---------|
| `test-send-alerts.ps1` | Call `/api/send-alerts` using `CRON_SECRET` from `.env.local` (or `-Secret`) |
| `e2e-smoke.cjs` | Playwright smoke test (login → dashboard); run with dev server up |

```powershell
# From repo root
.\scripts\test-send-alerts.ps1
npm run test:alerts
```
