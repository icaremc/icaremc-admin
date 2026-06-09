"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import ContentTranslationForm from "@/components/content/ContentTranslationForm";
import DailyTipForm from "@/components/content/DailyTipForm";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  contentActions,
  saveContentItem,
} from "@/features/content/contentSlice";
import {
  createEmptyDailyTipForm,
  dailyTipsActions,
  saveDailyTip,
  type DailyTipFormState,
} from "@/features/dailyTips/dailyTipsSlice";
import { namespaceLabel } from "@/lib/constants";
import { contentEntityPath, dailyTipPath } from "@/lib/content/contentLabels";
import { isUuid, namespaceUsesUuidEntityId, newUuidEntityId } from "@/lib/content/entityId";
import type { LocaleFormMap } from "@/lib/content/formTypes";
import {
  createEmptyForm,
  formToTranslations,
  validateForm,
} from "@/lib/content/transform";
import type { ContentNamespace } from "@/lib/types/database";

function NewDailyTipPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { saving, error, success } = useAppSelector((state) => state.dailyTips);
  const [form, setForm] = useState<DailyTipFormState>(() => createEmptyDailyTipForm());
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(dailyTipsActions.clearDailyTipMessages());
    setForm(createEmptyDailyTipForm());
  }, [dispatch]);

  const handleSave = async () => {
    setFormError(null);

    const result = await dispatch(saveDailyTip({ form }));

    if (saveDailyTip.fulfilled.match(result)) {
      router.replace(dailyTipPath(result.payload.id));
    }
    if (saveDailyTip.rejected.match(result)) {
      setFormError(result.payload as string);
    }
  };

  return (
    <>
      <PageHero
        title="New daily tip"
        description="Add a health tip for a specific pregnancy week and day"
        icon={FileText}
      />

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        <div className="mb-6">
          <Link
            href="/admin/content/daily_tip"
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to list
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

        <div className="admin-panel space-y-6">
          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <Label htmlFor="active">Active (visible in mobile app)</Label>
          </div>

          <DailyTipForm value={form} onChange={setForm} />

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Create tip"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function NewContentItemPage() {
  const params = useParams<{ namespace: ContentNamespace }>();
  const namespace = params.namespace;

  if (namespace === "daily_tip") {
    return <NewDailyTipPage />;
  }

  const router = useRouter();
  const dispatch = useAppDispatch();
  const { saving, error, success } = useAppSelector((state) => state.content);

  const [newEntityId, setNewEntityId] = useState("");
  const [form, setForm] = useState<LocaleFormMap>(() =>
    createEmptyForm(namespace),
  );
  const [isPublished, setIsPublished] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(contentActions.clearContentMessages());
    setForm(createEmptyForm(namespace));
    if (namespaceUsesUuidEntityId(namespace)) {
      setNewEntityId(newUuidEntityId());
    } else {
      setNewEntityId("");
    }
  }, [dispatch, namespace]);

  const handleSave = async () => {
    setFormError(null);

    const validationError = validateForm(namespace, form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const resolvedEntityId = namespaceUsesUuidEntityId(namespace)
      ? newEntityId.trim() || newUuidEntityId()
      : newEntityId.trim();

    if (!resolvedEntityId) {
      setFormError("Entity ID is required.");
      return;
    }
    if (namespaceUsesUuidEntityId(namespace) && !isUuid(resolvedEntityId)) {
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
        namespace,
        entityId: resolvedEntityId,
        translations,
        isPublished,
      }),
    );

    if (saveContentItem.fulfilled.match(result)) {
      router.replace(
        contentEntityPath(namespace, result.payload.entity_id),
      );
    }
    if (saveContentItem.rejected.match(result)) {
      setFormError(result.payload as string);
    }
  };

  return (
    <>
      <PageHero
        title="New content item"
        description={`${namespaceLabel(namespace)} · ${namespace}`}
        icon={FileText}
      />

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        <div className="mb-6">
          <Link
            href={`/admin/content/${namespace}`}
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to list
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

        <div className="admin-panel space-y-6">
          {!namespaceUsesUuidEntityId(namespace) ? (
            <div>
              <Label htmlFor="entityId">Entity ID</Label>
              <Input
                id="entityId"
                value={newEntityId}
                onChange={(e) => setNewEntityId(e.target.value)}
                placeholder="e.g. edd_lnmp, mission, 2"
                className="mt-1.5"
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
              {saving ? "Saving…" : "Create item"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
