# Staging backend (Render) — parallel to production

Production stays on Supabase. Staging turns on only when `NEXT_PUBLIC_USE_BACKEND_API=true`.

## Local staging

```bash
npm run dev:staging
```

Opens on [http://localhost:3001](http://localhost:3001) against `https://icaremc-backend.onrender.com`.

Sign in with a **staging admin** email/password (`POST /api/v1/auth/admin/login`).

## Deployed staging preview (Vercel)

1. Create a **second Vercel project** (e.g. `icaremc-admin-staging`) from the same GitHub repo — do **not** change production project env.
2. Set env on that project only:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_USE_BACKEND_API` | `true` |
| `USE_BACKEND_API` | `true` |
| `API_BASE_URL` | `https://icaremc-backend.onrender.com` |
| `NEXT_PUBLIC_API_BASE_URL` | `https://icaremc-backend.onrender.com` |

3. Optional: attach domain `admin-staging.…` or use the Vercel `*.vercel.app` URL.
4. Production project: leave `NEXT_PUBLIC_USE_BACKEND_API` **unset**.

CLI (from repo, after `vercel link` to the **staging** project):

```bash
vercel env add NEXT_PUBLIC_USE_BACKEND_API
# true
vercel --prod
```

Or deploy a Preview from branch `feat/staging-backend-parallel` with staging env in that project.

## How it works

| Flag | Behavior |
|------|----------|
| off (prod) | Unchanged Supabase + `/api/admin/*` |
| on (staging) | Login → Render; middleware rewrites `/api/admin/*` → bridge → Render; unsupported pages show “Not on staging API yet” |

Chapa webhooks and `activity/log` stay on Next even in staging mode.

## Available vs missing

See `lib/backend/capabilities.ts`.

**Missing on staging API (message shown):** referrals, children, content CMS, push, app-version, about, health-logs, many doctor detail sub-panels.

**Proxied when signed in:** dashboard, appointments list, doctors list, users, hospitals, categories, documents, membership, payouts, wallet, settings, admins, activity, legal, pregnancy weeks, child-growth periods (partial).

## Cutover later

Only when parity is good: point a **production** Render API at prod data, then set the flag on the production Vercel project. Until then, never set the flag on production.
