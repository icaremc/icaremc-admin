import { supabase } from "@/lib/supabaseClient";

/**
 * Upsert locale rows first, then delete locales no longer present.
 * Avoids wipe-on-failed-insert from delete-then-insert.
 */
export async function syncLocaleTranslationRows(params: {
  table: string;
  parentColumn: string;
  parentId: string;
  onConflict: string;
  rows: Array<Record<string, unknown> & { language_code: string }>;
}): Promise<string | null> {
  const { table, parentColumn, parentId, onConflict, rows } = params;

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from(table)
      .upsert(rows, { onConflict });
    if (upsertError) return upsertError.message;
  }

  let deleteQuery = supabase.from(table).delete().eq(parentColumn, parentId);
  if (rows.length > 0) {
    const keep = rows.map((row) => row.language_code);
    deleteQuery = deleteQuery.not(
      "language_code",
      "in",
      `(${keep.map((code) => `"${code}"`).join(",")})`,
    );
  }

  const { error: deleteError } = await deleteQuery;
  return deleteError?.message ?? null;
}
