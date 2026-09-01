export type AdminDocumentCategory = "agreement" | "policy" | "other";

export type AdminDocument = {
  id: string;
  title: string;
  category: AdminDocumentCategory;
  storage_path: string;
  file_name: string;
  mime_type: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentDelivery = {
  id: string;
  document_id: string;
  recipient_type: "doctor";
  recipient_id: string;
  sent_by: string | null;
  sent_at: string;
  acknowledged_at: string | null;
  document_title?: string;
  document_category?: AdminDocumentCategory;
  file_name?: string;
};

export const ADMIN_DOCUMENT_CATEGORY_LABELS: Record<AdminDocumentCategory, string> = {
  agreement: "Agreement",
  policy: "Policy",
  other: "Other",
};
