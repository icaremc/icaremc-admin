export async function uploadPregnancyWeekImage(
  weekId: string,
  file: File,
  options?: { remove?: boolean },
): Promise<string | null> {
  const formData = new FormData();
  if (options?.remove) {
    formData.append("remove_image", "true");
  } else {
    formData.append("image", file);
  }

  const response = await fetch(`/api/admin/pregnancy-weeks/${weekId}/image`, {
    method: "PATCH",
    body: formData,
  });

  const payload = (await response.json()) as {
    error?: string;
    week?: { image_url?: string | null };
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Image upload failed.");
  }

  return payload.week?.image_url ?? null;
}

export async function removePregnancyWeekImage(weekId: string) {
  const response = await fetch(`/api/admin/pregnancy-weeks/${weekId}/image`, {
    method: "DELETE",
  });

  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Image removal failed.");
  }
}
