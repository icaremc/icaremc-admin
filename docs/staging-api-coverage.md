# Staging API coverage

Source of truth: [OpenAPI / Swagger](https://api.icaremchealth.com/docs#/) (`https://api.icaremchealth.com/openapi.json`).

Admin staging mode (`NEXT_PUBLIC_USE_BACKEND_API=true`) proxies `/api/admin/*` through `lib/backend/proxy.ts` using `mapAdminApiToBackend` in `lib/backend/capabilities.ts`.

**Rule:** If it is not an **admin** (or explicitly allowed public) route in OpenAPI, the admin UI cannot integrate it. Doctor-app routes (`/api/v1/doctor/*`) require a doctor token and are not usable from the admin portal.

---

## Integrated (wired in admin)

| Admin area | Admin UI | Backend | Notes |
|---|---|---|---|
| Dashboard | `/admin/dashboard` | `GET /api/v1/admin/dashboard` | |
| Appointments | `/admin/appointments` | `GET\|PATCH /api/v1/admin/appointments` (+ detail by id) | |
| Doctors | `/admin/doctors` | list, services, wallet, booking write, verify, push, referral-stats | |
| Speciality | `/admin/doctor-categories` | full CRUD | Image upload not on staging |
| Hospitals | `/admin/hospitals` | full CRUD | Multipart → JSON + uploads |
| Parents | `/admin/users` | list + detail + push | |
| Children | `/admin/children` | `GET` list + detail | Nested growth/vaccines/edit not on staging |
| Referrals | `/admin/referrals` | referrals, commissions, settings, doctor stats | |
| Internal docs | `/admin/documents` | list, create metadata, deliver, delivery history | Multipart PDF limited |
| Payouts / wallet ledger | `/admin/finance/*` | payouts + wallet-transactions | |
| App membership | `/admin/finance/app-membership` | membership + subscription settings | Receipt file dropped on grant |
| Finance / payment settings | `/admin/finance/settings` | settings/finance + payment | |
| Portal admins | `/admin/admins` | list, create, patch | |
| Activity / legal / about / app version | corresponding pages | as before | |
| Pregnancy weeks | `/admin/pregnancy-weeks` | admin CRUD + translations; image via `/uploads` | FE merges public CMS langs if admin list omits translations (until BE PR #8 deploys) |
| Child milestones | `/admin/child-growth` | admin CRUD + translations; learning-path images via `/uploads` | |
| Follow-up visits | `/admin/followup-visits` | admin followup-templates CRUD | |
| Clinical advice | `/admin/child-growth/clinical-advice` | `GET /api/v1/cms/clinical-advice` | **Read-only** on staging |
| Content CMS daily tips | `/admin/content/daily_tip` | admin daily-tips CRUD + translations | |

---

## Still blocked (no admin API)

| Admin area | Why |
|---|---|
| Clinical advice **writes** | Public CMS GET only |
| Broadcast push (`/admin/push`) | Only per-user `/push/notify` exists |
| Health logs | No admin health-log API |
| Multipart PDF document upload | Staging uploads API is image-only |
| Children edit / nested growth detail | Admin GET returns bare child row |
| Speciality image upload | No category image upload on staging |

### Backend asks (remaining)

1. Merge/deploy pregnancy week nested translations on admin GET (PR #8) — FE already enriches from public CMS as a bridge
2. Admin clinical-advice write APIs (if CMS stays in this portal)
3. Non-image upload support for admin documents
4. Child nested detail joins (growth/vaccines on children)
5. Health-log / broadcast push admin APIs (if needed)

---

## How to re-check

```bash
curl -s https://api.icaremchealth.com/openapi.json | python3 -c "import json,sys; p=json.load(sys.stdin)['paths'];
print('\n'.join(sorted(f'{m.upper()} {path}' for path,ops in p.items() for m in ops if path.startswith('/api/v1/admin'))))"

npm test
npm run test:staging-smoke
```
