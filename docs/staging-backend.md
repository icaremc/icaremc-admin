# Staging backend (Render) — parallel to production

Production stays on Supabase. Staging turns on only when `NEXT_PUBLIC_USE_BACKEND_API=true`.

## Local staging

```bash
npm run dev:staging
```

Opens on [http://localhost:3001](http://localhost:3001) against `https://api.icaremchealth.com`.

Sign in with a **staging admin** email/password (`POST /api/v1/auth/admin/login`).

## Deployed staging preview (Vercel)

1. Create a **second Vercel project** (e.g. `icaremc-admin-staging`) from the same GitHub repo — do **not** change production project env.
2. Set env on that project only:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_USE_BACKEND_API` | `true` |
| `USE_BACKEND_API` | `true` |
| `API_BASE_URL` | `https://api.icaremchealth.com` |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.icaremchealth.com` |

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

Full matrix (integrated vs blocked, with OpenAPI paths):

→ **[staging-api-coverage.md](./staging-api-coverage.md)**

**Blocked on staging (no admin OpenAPI):** content CMS, broadcast push, health logs, multipart PDF document upload, and a few write-only prod flows (see coverage doc). Referrals, wallet, appointments, admins, documents, doctor booking, and children are wired pending backend PR deploy.

**Integrated when signed in:** dashboard, appointments, doctors (incl. services read), categories, hospitals, users, documents list/deliver, membership, payouts, wallet ledger, settings, admins, activity, legal/about, app version, pregnancy weeks, child-growth/followup lists.

## Tests

```bash
# Unit: path map, adapters, capability gates
npm test

# Live smoke against Render (optional credentials)
npm run test:staging-smoke
STAGING_ADMIN_EMAIL=… STAGING_ADMIN_PASSWORD=… npm run test:staging-smoke
```

Without credentials, smoke expects **401/403** on each admin GET (proves routes exist).
With credentials, expects **200**.

## Cutover later

Only when parity is good: point a **production** Render API at prod data, then set the flag on the production Vercel project. Until then, never set the flag on production.

