# ICare Doctors app — Internal document delivery

Mobile implementation guide for admin-shared PDFs (agreements, policies, etc.).

**Admin portal:** upload once in **Internal docs**, then send to a doctor from their profile → **Documents** tab.

---

## Flow

1. Admin uploads a PDF to the internal library.
2. Admin sends that document to a specific doctor.
3. Doctor receives an FCM push.
4. Doctor opens the document in the app, views the PDF, and acknowledges.
5. Admin sees **Pending** → **Acknowledged** on the doctor profile.

Each send creates a new `document_deliveries` row (re-sending the same PDF is a new delivery).

---

## Database

### `admin_documents`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `title` | text | Display name |
| `category` | text | `agreement` \| `policy` \| `other` |
| `storage_path` | text | Path in `admin-documents` bucket |
| `file_name` | text | Original filename |
| `mime_type` | text | `application/pdf` |
| `created_at` | timestamptz | |

### `document_deliveries`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK — use as `delivery_id` in push/deep link |
| `document_id` | uuid | FK → `admin_documents` |
| `recipient_type` | text | Always `doctor` |
| `recipient_id` | uuid | Doctor user id (`auth.users.id`) |
| `sent_by` | uuid | Admin user id |
| `sent_at` | timestamptz | |
| `acknowledged_at` | timestamptz | `null` until doctor acknowledges |

### Doctor access (RLS)

- `SELECT` own rows in `document_deliveries` where `recipient_id = auth.uid()`
- `UPDATE` own delivery to set `acknowledged_at`
- `SELECT` `admin_documents` only when a delivery exists for that doctor
- `SELECT` on `storage.objects` in bucket `admin-documents` only for delivered docs

---

## RPCs

All RPCs require an authenticated doctor session (`auth.uid()` = doctor).

### `list_my_document_deliveries()`

Returns all deliveries for the signed-in doctor, newest first.

```sql
select * from list_my_document_deliveries();
```

| Column | Type |
|--------|------|
| `id` | uuid |
| `document_id` | uuid |
| `title` | text |
| `category` | text |
| `file_name` | text |
| `sent_at` | timestamptz |
| `acknowledged_at` | timestamptz |

```ts
const { data, error } = await supabase.rpc("list_my_document_deliveries");
```

### `get_my_document_delivery_path(p_delivery_id uuid)`

Returns the storage path for a delivery that belongs to the current doctor.

```ts
const { data: storagePath, error } = await supabase.rpc(
  "get_my_document_delivery_path",
  { p_delivery_id: deliveryId },
);
```

Throws / errors if delivery not found or not owned by the doctor.

### `acknowledge_document_delivery(p_delivery_id uuid)`

Sets `acknowledged_at` to `now()` if not already set. Safe to call multiple times.

```ts
const { data, error } = await supabase.rpc("acknowledge_document_delivery", {
  p_delivery_id: deliveryId,
});
```

Returns the updated `document_deliveries` row.

---

## Storage

- **Bucket:** `admin-documents`
- **Private** (not public)
- **PDF only**, max 10 MB
- Paths look like: `library/{uuid}.pdf`

After `get_my_document_delivery_path` returns a path:

```ts
const { data, error } = await supabase.storage
  .from("admin-documents")
  .createSignedUrl(storagePath, 3600);
```

Use `data.signedUrl` in a WebView or native PDF viewer. Re-create the signed URL if it expires.

---

## Push notification

When admin sends a document, FCM **data** payload:

```json
{
  "type": "document",
  "route": "/document-delivery",
  "delivery_id": "<uuid>",
  "document_id": "<uuid>"
}
```

**Notification display (examples):**

- **title:** `New document to review`
- **body:** `Dear {firstName}, please review and acknowledge "{documentTitle}" in the ICare Doctors app.`
- Or a custom message if admin provided one when sending.

The same payload is stored in the `notifications` table (`data` column).

### Push handler

```ts
if (data.type === "document" && data.route === "/document-delivery") {
  navigate("/document-delivery", {
    deliveryId: data.delivery_id,
    documentId: data.document_id,
  });
}
```

If the user is not signed in, complete login first, then navigate with the stored `delivery_id`.

---

## Screens to build

### 1. Document delivery detail (`/document-delivery`)

**Input:** `delivery_id` from push or deep link.

**Load:**

```ts
const { data: deliveries } = await supabase.rpc("list_my_document_deliveries");
const delivery = deliveries?.find((row) => row.id === deliveryId);
```

**Show:**

- Title, category, filename
- Sent date
- Status: pending vs acknowledged (`acknowledged_at`)

**Actions:**

- **View PDF** — `get_my_document_delivery_path` → `createSignedUrl` → open viewer
- **Acknowledge** — `acknowledge_document_delivery(delivery_id)`

Suggested UX: enable acknowledge after the PDF has been opened at least once (client-side only).

### 2. Documents inbox (recommended)

List from `list_my_document_deliveries()`:

- Badge or highlight for rows where `acknowledged_at` is null
- Tap row → delivery detail screen

Can also be linked from profile/settings (“Documents from ICare”).

---

## Category labels

| `category` value | Display |
|------------------|---------|
| `agreement` | Agreement |
| `policy` | Policy |
| `other` | Other |

---

## Edge cases

| Case | Behavior |
|------|----------|
| Re-acknowledge | RPC is idempotent; existing `acknowledged_at` is kept |
| Expired signed URL | Call `get_my_document_delivery_path` again and create a new signed URL |
| Invalid `delivery_id` | RPC errors; show “Document not found” |
| Another doctor’s delivery | RLS blocks access — treat as not found |
| Push missing `delivery_id` | Fall back to documents inbox list |
| Doctor has no FCM token | Delivery row still created; doctor sees doc in inbox when they open the app |

---

## Test checklist

- [ ] Admin uploads PDF at `/admin/documents`
- [ ] Admin sends doc from doctor profile → Documents → Shared documents
- [ ] Doctor receives push on device
- [ ] Tap push opens correct delivery screen
- [ ] PDF loads from private bucket via signed URL
- [ ] Acknowledge updates `acknowledged_at`
- [ ] Admin portal shows **Acknowledged** on doctor delivery history
- [ ] Doctor cannot open another doctor’s `delivery_id` or storage path
- [ ] Inbox lists all deliveries, newest first
- [ ] Re-open acknowledged doc still works (read-only, already acknowledged)

---

## Reference — admin API (portal only)

Mobile app does **not** call these; listed for context.

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/admin/documents` | Library list + upload |
| `GET /api/admin/documents/[id]` | Single doc + signed preview |
| `GET/POST /api/admin/doctors/[id]/document-deliveries` | Delivery history + send + push |

---

## Questions

Contact the admin portal team if RPCs or storage access fail for a valid delivery.
