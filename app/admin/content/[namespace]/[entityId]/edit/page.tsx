"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import ContentTranslationForm from "@/components/content/ContentTranslationForm";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  contentActions,
  deleteContentItem,
  fetchContentItem,
  saveContentItem,
} from "@/features/content/contentSlice";
import { namespaceLabel } from "@/lib/constants";
import {
  contentEntityPath,
} from "@/lib/content/contentLabels";
import { isUuid, namespaceUsesUuidEntityId, newUuidEntityId } from "@/lib/content/entityId";
import type { LocaleFormMap } from "@/lib/content/formTypes";
import {
  createEmptyForm,
  formToTranslations,
  translationsToForm,
  validateForm,
} from "@/lib/content/transform";
import type { ContentNamespace } from "@/lib/types/database";
import DailyTipEditPage from "./DailyTipEditPage";

export default function ContentEditPage() {
  const params = useParams<{ namespace: ContentNamespace; entityId: string }>();
  const namespace = params.namespace;

  if (namespace === "daily_tip") {
    return <DailyTipEditPage />;
  }

  const router = useRouter();
  const dispatch = useAppDispatch();
  const { selected, loading, saving, error, success } = useAppSelector(
    (state) => state.content,
  );

  const entityId = decodeURIComponent(params.entityId);

  const [form, setForm] = useState<LocaleFormMap>(() =>
    createEmptyForm(namespace),
  );
  const [isPublished, setIsPublished] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(contentActions.clearContentMessages());
    setForm(createEmptyForm(namespace));
    dispatch(fetchContentItem({ namespace, entityId }));
  }, [dispatch, namespace, entityId]);

  useEffect(() => {
    if (selected) {
      setForm(translationsToForm(namespace, selected.translations));
      setIsPublished(selected.is_published);
    }
  }, [selected, namespace]);

  const handleSave = async () => {
    setFormError(null);

    const validationError = validateForm(namespace, form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (namespaceUsesUuidEntityId(namespace) && !isUuid(selected!.entity_id)) {
      setFormError("This content type must use a valid UUID identifier.");
      return;
    }

    const translations = formToTranslations(namespace, form);
    if (!translations.en) {
      setFormError("English translation is required.");
      return;
    }

    const result = await dispatch(
      saveContentItem({
        id: selected?.id,
        namespace,
        entityId: selected!.entity_id,
        translations,
        isPublished,
      }),
    );

    if (saveContentItem.fulfilled.match(result)) {
      router.replace(contentEntityPath(namespace, result.payload.entity_id));
    }
    if (saveContentItem.rejected.match(result)) {
      setFormError(result.payload as string);
    }
  };

  const handleDelete = async () => {
    if (!selected?.id) return;
    if (!window.confirm("Delete this content item?")) return;
    const result = await dispatch(deleteContentItem(selected.id));
    if (deleteContentItem.fulfilled.match(result)) {
      router.replace(`/admin/content/${namespace}`);
    }
  };

  return (
    <>
      <PageHero
        title={`Edit ${entityId}`}
        description={`${namespaceLabel(namespace)} · ${namespace}`}
        icon={FileText}
      />

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link
            href={contentEntityPath(namespace, entityId)}
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to details
          </Link>
          <Link
            href={`/admin/content/${namespace}`}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline"
          >
            All items
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}
        {formError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {formError}
          </div>
        ) : null}

        {loading || !selected ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : (
          <div className="admin-panel space-y-6">
            {!namespaceUsesUuidEntityId(namespace) ? (
              <div>
                <Label>Entity ID</Label>
                <Input
                  value={entityId}
                  readOnly
                  className="mt-1.5 bg-gray-50"
                />
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <input
                id="published"
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              <Label htmlFor="published">
                Published (visible in mobile app)
              </Label>
            </div>

            <ContentTranslationForm
              namespace={namespace}
              value={form}
              onChange={setForm}
            />

            <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
