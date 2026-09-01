"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowRight, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  type DocumentDelivery,
} from "@/lib/adminDocuments/types";
import { formatDateTime } from "@/lib/format";
import { useAdminCanManage, useAdminCanView, useIsSuperAdmin } from "@/lib/useAdminPermissions";

interface DoctorSharedDocumentsProps {
  doctorId: string;
}

export default function DoctorSharedDocuments({ doctorId }: DoctorSharedDocumentsProps) {
  const canManage = useAdminCanManage("manage_doctors");
  const canView = useAdminCanView("manage_doctors");
  const isSuperAdmin = useIsSuperAdmin();
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [deliveries, setDeliveries] = useState<DocumentDelivery[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [documentsRes, deliveriesRes] = await Promise.all([
        fetch("/api/admin/documents"),
        fetch(`/api/admin/doctors/${doctorId}/document-deliveries`),
      ]);

      const documentsPayload = (await documentsRes.json()) as {
        error?: string;
        documents?: AdminDocument[];
      };
      const deliveriesPayload = (await deliveriesRes.json()) as {
        error?: string;
        deliveries?: DocumentDelivery[];
      };

      if (!documentsRes.ok) {
        throw new Error(documentsPayload.error ?? "Failed to load documents");
      }
      if (!deliveriesRes.ok) {
        throw new Error(deliveriesPayload.error ?? "Failed to load deliveries");
      }

      setDocuments(documentsPayload.documents ?? []);
      setDeliveries(deliveriesPayload.deliveries ?? []);
      setSelectedDocumentId((current) => current || documentsPayload.documents?.[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shared documents");
      setDocuments([]);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !selectedDocumentId) return;

    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/doctors/${doctorId}/document-deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedDocumentId,
          note: note.trim() || undefined,
        }),
      });
      const payload = (await res.json()) as {
        error?: string;
        push?: { skipped?: string; error?: string };
      };
      if (!res.ok) throw new Error(payload.error ?? "Send failed");

      if (payload.push?.skipped) {
        setMessage(`Document recorded. Push not sent: ${payload.push.skipped}`);
      } else if (payload.push && "error" in payload.push && payload.push.error) {
        setMessage(`Document sent, but push failed: ${payload.push.error}`);
      } else {
        setMessage("Document sent and doctor notified.");
      }

      setNote("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  if (!canView) return null;

  return (
    <div className="space-y-6">
      <div className="admin-panel">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Shared documents</h3>
            <p className="text-sm text-gray-500">
              Send a PDF from the internal library. The doctor gets a push and can acknowledge in the app.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        {canManage && !loading && documents.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-sm text-amber-900">
              No internal documents yet. Upload a PDF in the library before you can send one to this doctor.
            </p>
            {isSuperAdmin ? (
              <Link
                href="/admin/documents"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
              >
                Go to Internal docs
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <p className="mt-2 text-sm text-amber-800">
                Ask a super admin to upload documents in Internal docs.
              </p>
            )}
          </div>
        ) : null}

        {canManage && (loading || documents.length > 0) ? (
          <form onSubmit={(event) => void handleSend(event)} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="shared_document">Document</Label>
              <select
                id="shared_document"
                value={selectedDocumentId}
                onChange={(event) => setSelectedDocumentId(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                disabled={documents.length === 0}
              >
                {documents.length === 0 ? (
                  <option value="">Upload a document first</option>
                ) : (
                  documents.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.title} ({ADMIN_DOCUMENT_CATEGORY_LABELS[document.category]})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="shared_note">Push message (optional)</Label>
              <textarea
                id="shared_note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                placeholder="Please review and acknowledge the provider agreement."
              />
            </div>
            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={sending || !selectedDocumentId || documents.length === 0}
              >
                <Send className="mr-2 h-4 w-4" />
                {sending ? "Sending…" : "Send document"}
              </Button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="admin-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-gray-500">
                  Loading delivery history…
                </TableCell>
              </TableRow>
            ) : deliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-gray-500">
                  No documents sent to this doctor yet.
                </TableCell>
              </TableRow>
            ) : (
              deliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell>
                    <p className="font-medium text-gray-900">
                      {delivery.document_title ?? "Document"}
                    </p>
                    <p className="text-xs text-gray-500">{delivery.file_name}</p>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDateTime(delivery.sent_at)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        delivery.acknowledged_at
                          ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                          : "inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800"
                      }
                    >
                      {delivery.acknowledged_at ? "Acknowledged" : "Pending"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
