# Staging API coverage

Source of truth: [OpenAPI / Swagger](https://api.icaremchealth.com/docs#/) (`https://api.icaremchealth.com/openapi.json`).

Admin staging mode (`NEXT_PUBLIC_USE_BACKEND_API=true`) proxies `/api/admin/*` through `lib/backend/proxy.ts` using `mapAdminApiToBackend` in `lib/backend/capabilities.ts`.

**Rule:** If it is not an **admin** (or explicitly allowed public) route in OpenAPI, the admin UI cannot integrate it. Doctor-app routes (`/api/v1/doctor/*`) require a doctor token and are not usable from the admin portal.

---

## Integrated (wired in admin; some pending backend PR deploy)

| Admin area | Admin UI | Backend | Notes |
|---|---|---|---|
| Dashboard | `/admin/dashboard` | `GET /api/v1/admin/dashboard` | |
| Appointments | `/admin/appointments` | `GET\|PATCH /api/v1/admin/appointments` (+ detail by id) | PR #3 / #5 |
| Doctors | `/admin/doctors` | list, services, wallet, booking write, verify, push, referral-stats | PRs #1–#4 |
| Speciality | `/admin/doctor-categories` | full CRUD | |
| Hospitals | `/admin/hospitals` | full CRUD | Multipart → JSON + slug |
| Parents | `/admin/users` | list + detail + push | |
| Children | `/admin/children` | `GET` list + detail | PR #5; growth/vaccines/edit not on staging |
| Referrals | `/admin/referrals` | referrals, commissions, settings, doctor stats | PR #1 |
| Internal docs | `/admin/documents` | list, create metadata, deliver, delivery history | PR #3; multipart PDF limited |
| Payouts / wallet ledger | `/admin/finance/*` | payouts + wallet-transactions | |
| App membership | `/admin/finance/app-membership` | membership + subscription settings | |
| Finance / payment settings | `/admin/finance/settings` | settings/finance + payment | |
| Portal admins | `/admin/admins` | list, create, patch | PR #3 |
| Activity / legal / about / app version | corresponding pages | as before | |
| Pregnancy weeks / child growth / follow-ups | corresponding pages | list (+ limited writes) | |
| Content CMS daily tips | `/admin/content/daily_tip` | `GET /api/v1/cms/daily-tips` (read) | Writes: backend `feat/admin-cms-writes` → `/api/v1/admin/daily-tips` |

---

## Still blocked (no admin API)

| Admin area | Why |
|---|---|
| Content CMS **writes** (until CMS PR merges) | Read via public CMS; admin CRUD pending deploy |
| Broadcast push (`/admin/push`) | Only per-user `/push/notify` exists |
| Health logs | No admin health-log API |
| Child growth / follow-up **writes** | List-only admin routes |
| Multipart PDF document upload | Staging uploads API is image-only |

### Backend asks (remaining)

1. Merge/deploy admin daily-tip CMS writes (`feat/admin-cms-writes`)
2. Non-image upload support for admin documents
3. Child milestone / vaccine / growth write + nested detail joins
4. Health-log / broadcast push admin APIs (if needed)

---

## How to re-check

```bash
curl -s https://api.icaremchealth.com/openapi.json | python3 -c "import json,sys; p=json.load(sys.stdin)['paths'];
print('\n'.join(sorted(f'{m.upper()} {path}' for path,ops in p.items() for m in ops if path.startswith('/api/v1/admin'))))"

npm test
npm run test:staging-smoke
```
