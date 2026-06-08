# ICARE-MC — Supabase setup

## 1. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and create a project.
2. Wait for the database to finish provisioning.

## 2. Run the database schema

1. Open **SQL Editor** in the Supabase dashboard.
2. Paste the contents of [`schema.sql`](./schema.sql).
3. Click **Run**.

This creates:

| Table | Purpose |
|-------|---------|
| `profiles` | User profile (linked to Auth) |
| `pregnancy_profiles` | LNMP, EDD, conditions, hospital |
| `daily_health_logs` | Symptoms + daily checklist per date |
| `child_profiles` | Baby birthday and sex |
| `milestone_checks` | Developmental milestone progress |
| `appointments` | Prenatal visits (future UI) |
| `content_translations` | Localized **content** only (JSONB: en / am / om) |

Row Level Security (RLS) is enabled so each user only sees their own data.

### SQL run order

Run these in the Supabase SQL Editor, in order:

1. [`schema.sql`](./schema.sql) — core tables + RLS
2. [`content_translations.sql`](./content_translations.sql) — CMS content table
3. [`hardcoded_content_migration.sql`](./hardcoded_content_migration.sql) — seed content from the Flutter app
4. [`admin_policies.sql`](./admin_policies.sql) — admin portal access (required for icaremc-admin)
5. [`daily_tip_uuid_migration.sql`](./daily_tip_uuid_migration.sql) — migrate daily tip entity IDs to UUIDs (if needed)
6. [`daily_tip_week_migration.sql`](./daily_tip_week_migration.sql) — assign pregnancy week numbers to daily tips
7. [`daily_tip_day_migration.sql`](./daily_tip_day_migration.sql) — assign day numbers (1–7) within each week
8. [`daily_tips_migration.sql`](./daily_tips_migration.sql) — normalize daily tips into `daily_tips` + `daily_tip_translations`
9. [`daily_tips_schema_cleanup.sql`](./daily_tips_schema_cleanup.sql) — fix PostgREST embed + RPCs for `tip_id` FK
10. [`v2_uuid_normalized.sql`](./v2_uuid_normalized.sql) — normalized UUID tables (pregnancy weeks, mothers, pregnancy logs)
11. [`v2_admin_policies.sql`](./v2_admin_policies.sql) — admin access for v2 tables
12. [`pregnancy_week_linking.sql`](./pregnancy_week_linking.sql) — link gestational week/day to daily tips
13. [`user_roles_migration.sql`](./user_roles_migration.sql) — profile roles (admin / mother / partner)

### Content translations

The `content_translations` table stores editable content: child milestones. Daily tips live in `daily_tips` + `daily_tip_translations`. UI chrome strings remain in the Flutter app (`app_en`, `app_am`, `app_om`).

### Admin portal setup

After running `admin_policies.sql` and `user_roles_migration.sql`, grant admin access to your account:

```sql
update public.profiles
set role = 'admin', is_admin = true
where id = (select id from auth.users where email = 'your-admin@email.com');
```

Configure `icaremc-admin/.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_ADMIN_EMAILS=your-admin@email.com
```

The service role key is required for **Create user** in the admin Users section. Find it under **Project Settings → API → service_role** (server only — never expose in the browser).

## 3. Configure the Flutter app

Copy `.env.example` to `.env` in the project root:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

Find these under **Project Settings → API**.

Add `.env` to `pubspec.yaml` assets (already listed) and run:

```bash
flutter pub get
flutter run
```

## 4. Auth settings (recommended)

In **Authentication → Providers → Email**:

- Enable **Email** provider
- For testing, you can disable “Confirm email” so sign-up works immediately

## 5. Troubleshooting sync errors

If you see `Failed host lookup: 'xxxx.supabase.co'` in the console:

1. **Internet** — Phone or emulator must be online (Wi‑Fi or mobile data).
2. **`.env` values** — In Supabase: **Project Settings → API**. Copy exactly:
   - `SUPABASE_URL` = `https://YOUR_REF.supabase.co` (no trailing slash)
   - `SUPABASE_ANON_KEY` = anon public key
3. **Project active** — In the Supabase dashboard, confirm the project is not paused.
4. **Rebuild after changing `.env`** — Run `flutter pub get` then `flutter run` (release APK must include `.env` in assets).

The app still works offline with local data; cloud sync runs again when the network is available.

## 6. Verify

1. Sign up with email/password in the app.
2. Complete onboarding (LNMP, etc.).
3. In Supabase **Table Editor**, check `profiles` and `pregnancy_profiles` for new rows.
