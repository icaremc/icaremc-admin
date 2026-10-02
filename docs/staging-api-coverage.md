# Staging API coverage

Source of truth: [OpenAPI / Swagger](https://api.icaremchealth.com/docs#/) (`https://api.icaremchealth.com/openapi.json`).

Admin staging mode (`NEXT_PUBLIC_USE_BACKEND_API=true`) proxies `/api/admin/*` through `lib/backend/proxy.ts` using `mapAdminApiToBackend` in `lib/backend/capabilities.ts`.

**Rule:** If it is not an **admin** (or explicitly allowed public) route in OpenAPI, the admin UI cannot integrate it. Doctor-app routes (`/api/v1/doctor/*`) require a doctor token and are not usable from the admin portal.

---

## Integrated (exists in OpenAPI + wired in admin)

| Admin area | Admin UI | Backend | Notes |
|---|---|---|---|
| Dashboard | `/admin/dashboard` | `GET /api/v1/admin/dashboard` | |
| Appointments | `/admin/appointments` | `GET /api/v1/admin/appointments` | Detail synthesized from list |
| Doctors list / verify / push | `/admin/doctors` | `GET /api/v1/admin/doctors`, `POST …/verify`, `POST /api/v1/push/notify` | |
| Doctor detail + **services** (read) | `/admin/doctors/[id]` | `GET /api/v1/admin/doctors` + `GET /api/v1/admin/doctors/{id}/services` | Bridge merges list row + services |
| Speciality | `/admin/doctor-categories` | `GET\|POST\|PATCH\|DELETE /api/v1/admin/doctor-categories` | |
| Hospitals | `/admin/hospitals` | `GET\|POST\|PATCH\|DELETE /api/v1/admin/hospitals` | Multipart → JSON + slug; image via `POST /api/v1/uploads/` |
| Parents | `/admin/users` | `GET /api/v1/admin/users`, `GET …/users/{id}` | Per-user push via `/push/notify` |
| Internal docs (list + deliver) | `/admin/documents`, doctor shared docs | `GET /api/v1/admin/documents`, `POST …/documents/{id}/deliver?recipient_id=` | Upload + delivery history not in OpenAPI |
| Payout requests | `/admin/finance/payout-request` | `GET /api/v1/admin/payout-requests`, `POST …/{id}` | |
| Wallet transactions | `/admin/finance/wallet-transactions` | `GET /api/v1/admin/wallet-transactions` | Global ledger, not per-doctor wallet |
| App membership | `/admin/finance/app-membership` | `GET\|grant\|revoke /api/v1/admin/membership`, `GET\|PUT …/settings/subscription` | Revoke uses **subscription id** |
| Finance / payment settings | `/admin/finance/settings` | `GET\|PUT …/settings/finance`, `…/payment` | |
| Appointment payments | `/admin/finance/payment` | Appointments list | No separate payments admin API |
| Portal admins | `/admin/admins` | `GET\|POST /api/v1/admin/admins` | Create/list only (no PATCH in OpenAPI) |
| Activity log | `/admin/activity` | `GET …/activity/admin`, `…/platform` | `source=all` merges both |
| Policies / About | `/admin/legal`, `/admin/about` | `GET\|PUT /api/v1/admin/legal-documents` | UI PATCH rewritten to PUT |
| App release | `/admin/app-version` | `GET\|PUT …/settings/app_version*` | |
| Pregnancy weeks | `/admin/pregnancy-weeks` | `GET\|POST /api/v1/admin/pregnancy-weeks` (+ translations) | Update/delete/image limited vs prod |
| Child milestones | `/admin/child-growth` | `GET /api/v1/admin/child-growth-periods` | **List only** |
| Follow-up visits | `/admin/followup-visits` | `GET /api/v1/admin/followup-templates` | **List only** |
| Auth | Login | `POST /api/v1/auth/admin/login` | |
| **Referrals** | `/admin/referrals` | `GET /api/v1/admin/referrals`, `…/referral-commissions`, `GET\|PUT …/settings/referral`, `GET …/doctors/{id}/referral-stats` | Pending backend PR merge + deploy; bridge already wired |

---

## Not in OpenAPI admin API (cannot integrate)

These production-admin features have **no matching admin endpoint** on [api.icaremchealth.com](https://api.icaremchealth.com/docs#/). Staging shows “Not on staging API yet” and hides them from the sidebar.

| Admin area | Why blocked | Closest OpenAPI (unusable for admin) |
|---|---|---|
| **Doctor wallet / earnings** (doctor detail tab) | No admin wallet-by-doctor API | `GET /api/v1/doctor/wallet` (doctor token only) |
| **Edit doctor services / booking** | No admin booking/services write API | `/api/v1/doctor/services*` (doctor token only) |
| **Children** | No admin children API | Patient `/api/v1/children*` |
| **Content CMS** (`/admin/content/*`) | No admin CMS write/list for tips/symptoms/etc. | Public `GET /api/v1/cms/*` only |
| **Broadcast push** (`/admin/push`) | No broadcast admin API | `POST /api/v1/push/notify` is per-user only (already used for doctor/parent push) |
| **Health logs** | No admin health-log API | — |
| **Document upload** | Admin documents are GET + deliver only | — |
| **Document delivery history** | No list-deliveries admin route | Deliver exists; history does not |
| **Appointment status change** | Appointments are GET-only | — |
| **Admin user edit/deactivate** | Admins are GET + POST create only | — |
| **Child milestone / follow-up writes** | List-only admin routes | — |

### Backend asks (to unlock the gaps)

Add **admin** routes (not doctor-scoped), for example:

1. `GET /api/v1/admin/doctors/{id}/wallet` (and earnings)
2. `GET/PATCH /api/v1/admin/doctors/{id}/services` (or booking)
3. Admin children / health-logs / CMS mutations (if those stay in this portal)
4. `POST /api/v1/admin/documents` (upload) + delivery history list
5. `PATCH /api/v1/admin/appointments/{id}` (status)
6. `PATCH /api/v1/admin/admins/{id}`

Until those land, the admin bridge correctly returns 501 / gates the UI.

---

## OpenAPI admin endpoints not exposed as product UI

| Backend | Notes |
|---|---|
| `POST /api/v1/admin/bootstrap-super-admin` | One-shot ops; not a portal page |

---

## How to re-check

```bash
# Diff OpenAPI vs mapAdminApiToBackend cases
curl -s https://api.icaremchealth.com/openapi.json | python3 -c "import json,sys; p=json.load(sys.stdin)['paths'];
print('\n'.join(sorted(f'{m.upper()} {path}' for path,ops in p.items() for m in ops if path.startswith('/api/v1/admin'))))"

npm test
npm run test:staging-smoke
```
