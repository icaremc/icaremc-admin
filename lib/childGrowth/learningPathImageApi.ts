export async function uploadLearningPathImages(
  files: File[],
): Promise<string[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("images", file);
  }

  const response = await fetch(
    "/api/admin/child-growth/learning-path-images",
    {
      method: "POST",
      body: formData,
    },
  );

  const payload = (await response.json()) as {
    error?: string;
    urls?: string[];
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Image upload failed.");
  }

  return payload.urls ?? [];
}
