"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ExternalLink, FileText, Upload } from "lucide-react";
import PageHero from "@/components/PageHero";
import { AdminSelect, type AdminSelectOption } from "@/components/ui/admin-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ADMIN_DOCUMENT_CATEGORY_LABELS,
  type AdminDocument,
  type AdminDocumentCategory,
} from "@/lib/adminDocuments/types";
import {
  ADMIN_DOCUMENT_MAX_BYTES,
  adminDocumentMaxSizeLabel,
} from "@/lib/adminDocuments/storage";
import { formatDateTime } from "@/lib/format";
import { useIsSuperAdmin } from "@/lib/useAdminPermissions";

type AdminDocumentRow = AdminDocument & { preview_url?: string | null };

const CATEGORY_OPTIONS: AdminSelectOption<AdminDocumentCategory>[] = [
  { value: "agreement", label: ADMIN_DOCUMENT_CATEGORY_LABELS.agreement },
  { value: "policy", label: ADMIN_DOCUMENT_CATEGORY_LABELS.policy },
  { value: "other", label: ADMIN_DOCUMENT_CATEGORY_LABELS.other },
];

export default function InternalDocumentsPage() {
  const canManage = useIsSuperAdmin();
  const [documents, setDocuments] = useState<AdminDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<AdminDocumentCategory>("agreement");
  const [file, setFile] = useState<File | null>(null);
  const fileTooLarge = file !== null && file.size > ADMIN_DOCUMENT_MAX_BYTES;

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/documents");
      const payload = (await res.json()) as {
        error?: string;
        documents?: AdminDocumentRow[];
      };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load documents");
      setDocuments(payload.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !file) return;
    if (file.size > ADMIN_DOCUMENT_MAX_BYTES) {
      setError(`File is too large. Maximum size is ${adminDocumentMaxSizeLabel()}.`);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("category", category);
      formData.set("file", file);

      const res = await fetch("/api/admin/documents", {
        method: "POST",
        body: formData,
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Upload failed");

      setTitle("");
      setCategory("agreement");
      setFile(null);
      setMessage("Document uploaded.");
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHero
        title="Internal documents"
        description="Upload PDFs once, then send them to doctors from their profile."
        icon={FileText}
        stat={{ label: "Documents", value: documents.length }}
      />

      <div className="admin-page space-y-6">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        {canManage ? (
          <form
            onSubmit={(event) => void handleUpload(event)}
            className="admin-panel grid gap-4 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900">Upload PDF</h2>
              <p className="mt-1 text-sm text-gray-500">
                PDF only · Max {adminDocumentMaxSizeLabel()} per file
              </p>
            </div>
            <div>
              <Label htmlFor="doc_title">Title</Label>
              <Input
                id="doc_title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Provider agreement 2026"
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="doc_category">Category</Label>
              <AdminSelect
                id="doc_category"
                value={category}
                options={CATEGORY_OPTIONS}
                onChange={setCategory}
                className="mt-1.5"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="doc_file">PDF file</Label>
              <Input
                id="doc_file"
                type="file"
                accept="application/pdf"
                className="mt-1.5"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
              />
              {file ? (
                <p
                  className={
                    fileTooLarge
                      ? "mt-1.5 text-sm text-red-600"
                      : "mt-1.5 text-sm text-gray-500"
                  }
                >
                  Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                  {fileTooLarge ? ` — exceeds ${adminDocumentMaxSizeLabel()} limit` : null}
                </p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={saving || !file || !title.trim() || fileTooLarge}
              >
                <Upload className="mr-2 h-4 w-4" />
                {saving ? "Uploading…" : "Upload document"}
              </Button>
            </div>
          </form>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-500">
                    Loading documents…
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-500">
                    No documents uploaded yet.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium text-gray-900">
                      {document.title}
                    </TableCell>
                    <TableCell>
                      {ADMIN_DOCUMENT_CATEGORY_LABELS[document.category]}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {document.file_name}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDateTime(document.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {document.preview_url ? (
                        <a
                          href={document.preview_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
                        >
                          Open
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
