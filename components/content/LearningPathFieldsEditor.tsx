"use client";

import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  ImagePlus,
  Loader2,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { ImageLightbox } from "@/components/content/ImageGallery";
import { VideoEmbed } from "@/components/content/VideoEmbed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { uploadLearningPathImages } from "@/lib/childGrowth/learningPathImageApi";
import { collectLearningPathImageUrls } from "@/lib/content/learningPathMedia";
import {
  EMPTY_LEARNING_PATH_ITEM,
  type LearningPathItemFields,
  type MilestoneCategoryFields,
} from "@/lib/content/formTypes";
import { parseYouTubeVideoId } from "@/lib/content/youtube";
import { cn } from "@/lib/utils";

type LearningPathFieldsEditorProps = {
  categories: MilestoneCategoryFields[];
  onChange: (categories: MilestoneCategoryFields[]) => void;
};

type LightboxState = {
  urls: string[];
  index: number;
};

function ItemImageCarousel({
  images,
  canUpload,
  isUploading,
  onOpenLightbox,
  onRemoveCurrent,
  onAddClick,
}: {
  images: string[];
  canUpload: boolean;
  isUploading: boolean;
  onOpenLightbox: (index: number) => void;
  onRemoveCurrent: (url: string) => void;
  onAddClick: () => void;
}) {
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(images.length - 1, 0));
  const current = images[safeIndex];
  const hasMultiple = images.length > 1;

  if (!current) return null;

  return (
    <div className="flex flex-wrap items-start gap-2">
      <div className="w-full max-w-xs">
        <div className="group relative aspect-video overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
          <button
            type="button"
            onClick={() => onOpenLightbox(safeIndex)}
            className="absolute inset-0 z-0"
            aria-label="Open image fullscreen"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt=""
              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
            />
          </button>

          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100" />

          {hasMultiple ? (
            <>
              <button
                type="button"
                onClick={() =>
                  setIndex((i) => (i - 1 + images.length) % images.length)
                }
                className="absolute left-1.5 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white shadow-sm transition hover:bg-black/75"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => (i + 1) % images.length)}
                className="absolute right-1.5 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white shadow-sm transition hover:bg-black/75"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="absolute bottom-1.5 left-1/2 z-[2] -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                {safeIndex + 1} / {images.length}
              </span>
            </>
          ) : null}

          <div className="absolute bottom-1.5 right-1.5 z-[2] flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={() => onOpenLightbox(safeIndex)}
              className="inline-flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-1 text-[10px] font-medium text-gray-800 shadow-sm hover:bg-white"
            >
              <Expand className="h-3 w-3" />
              View
            </button>
            <button
              type="button"
              onClick={() => {
                onRemoveCurrent(current);
                setIndex((i) => Math.max(0, Math.min(i, images.length - 2)));
              }}
              className="rounded-md bg-black/55 p-1 text-white hover:bg-red-600"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {canUpload || isUploading ? (
        <button
          type="button"
          disabled={!canUpload}
          onClick={onAddClick}
          className={cn(
            "flex aspect-video w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 bg-white text-gray-500 transition",
            canUpload &&
              "hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-4 w-4" />
              <span className="text-[10px] font-medium">Add</span>
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

export default function LearningPathFieldsEditor({
  categories,
  onChange,
}: LearningPathFieldsEditorProps) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateCategory = (
    index: number,
    patch: Partial<MilestoneCategoryFields>,
  ) => {
    onChange(
      categories.map((category, i) =>
        i === index ? { ...category, ...patch } : category,
      ),
    );
  };

  const updateItem = (
    categoryIndex: number,
    itemIndex: number,
    patch: Partial<LearningPathItemFields>,
  ) => {
    const category = categories[categoryIndex];
    if (!category) return;

    const nextItems = category.items.map((item, i) => {
      if (i !== itemIndex) return item;
      const merged = { ...item, ...patch };
      if (patch.image_urls !== undefined) {
        merged.image_urls = patch.image_urls;
        merged.image_url = patch.image_urls[0] ?? "";
        if (patch.image_urls.length > 0) {
          merged.video_url = "";
        }
      }
      if (patch.video_url !== undefined && patch.video_url.trim()) {
        merged.image_urls = [];
        merged.image_url = "";
      }
      return merged;
    });

    updateCategory(categoryIndex, { items: nextItems });
  };

  const setItemImages = (
    categoryIndex: number,
    itemIndex: number,
    urls: string[],
  ) => {
    updateItem(categoryIndex, itemIndex, {
      image_urls: urls,
      image_url: urls[0] ?? "",
      ...(urls.length > 0 ? { video_url: "" } : {}),
    });
  };

  async function handleUpload(
    categoryIndex: number,
    itemIndex: number,
    files: FileList | null,
  ) {
    if (!files || files.length === 0) return;
    const currentItem =
      categories[categoryIndex]?.items[itemIndex] ?? EMPTY_LEARNING_PATH_ITEM;
    if (currentItem.video_url.trim()) {
      setUploadError("Clear the video URL before uploading images.");
      return;
    }
    const key = `${categoryIndex}-${itemIndex}`;
    setUploadError(null);
    setUploadingKey(key);
    try {
      const uploaded = await uploadLearningPathImages(Array.from(files));
      const current = collectLearningPathImageUrls(currentItem);
      setItemImages(categoryIndex, itemIndex, [...current, ...uploaded]);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Upload failed.",
      );
    } finally {
      setUploadingKey(null);
      const input = fileInputRefs.current[key];
      if (input) input.value = "";
    }
  }

  function addCategory() {
    onChange([
      ...categories,
      { title: "", items: [{ ...EMPTY_LEARNING_PATH_ITEM }] },
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Categories</p>
          <p className="text-xs text-gray-500">
            {categories.length} categor
            {categories.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addCategory}>
          <Plus className="mr-1 h-4 w-4" />
          Category
        </Button>
      </div>

      {uploadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {uploadError}
        </div>
      ) : null}

      {categories.length === 0 ? (
        <button
          type="button"
          onClick={addCategory}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-sm text-gray-500 transition hover:border-emerald-400 hover:bg-emerald-50/40 hover:text-emerald-800"
        >
          <Plus className="h-5 w-5" />
          Add first category
        </button>
      ) : (
        <div className="space-y-4">
          {categories.map((category, categoryIndex) => (
            <section
              key={categoryIndex}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-semibold text-emerald-800">
                  {categoryIndex + 1}
                </span>
                <Input
                  value={category.title}
                  onChange={(e) =>
                    updateCategory(categoryIndex, { title: e.target.value })
                  }
                  placeholder="Category name"
                  className="h-9 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
                />
                {categories.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      onChange(categories.filter((_, i) => i !== categoryIndex))
                    }
                    className="rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove category"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="divide-y divide-gray-100">
                {category.items.map((item, itemIndex) => {
                  const uploadKey = `${categoryIndex}-${itemIndex}`;
                  const images = collectLearningPathImageUrls(item);
                  const hasImages = images.length > 0;
                  const hasVideo = item.video_url.trim().length > 0;
                  const isUploading = uploadingKey === uploadKey;
                  const canUploadImages = !hasVideo && !isUploading;
                  const canEditVideo = !hasImages;

                  return (
                    <div key={itemIndex} className="space-y-3 p-3 sm:p-4">
                      <div className="flex items-start gap-2">
                        <Input
                          value={item.label}
                          onChange={(e) =>
                            updateItem(categoryIndex, itemIndex, {
                              label: e.target.value,
                            })
                          }
                          placeholder="Milestone text"
                          className="h-10 flex-1"
                        />
                        {category.items.length > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateCategory(categoryIndex, {
                                items: category.items.filter(
                                  (_, i) => i !== itemIndex,
                                ),
                              })
                            }
                            className="mt-0.5 rounded-md p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>

                      <Textarea
                        value={item.explanation}
                        onChange={(e) =>
                          updateItem(categoryIndex, itemIndex, {
                            explanation: e.target.value,
                          })
                        }
                        placeholder="Explanation"
                        rows={2}
                        className="min-h-[4.5rem] resize-y"
                      />

                      <div className="space-y-2">
                        {hasImages ? (
                          <ItemImageCarousel
                            images={images}
                            canUpload={canUploadImages}
                            isUploading={isUploading}
                            onOpenLightbox={(index) =>
                              setLightbox({ urls: images, index })
                            }
                            onRemoveCurrent={(url) =>
                              setItemImages(
                                categoryIndex,
                                itemIndex,
                                images.filter((entry) => entry !== url),
                              )
                            }
                            onAddClick={() =>
                              fileInputRefs.current[uploadKey]?.click()
                            }
                          />
                        ) : (
                          <button
                            type="button"
                            disabled={!canUploadImages}
                            title={
                              hasVideo
                                ? "Clear the video URL to upload images"
                                : "Upload images"
                            }
                            onClick={() => {
                              if (!canUploadImages) {
                                if (hasVideo) {
                                  setUploadError(
                                    "Clear the video URL before uploading images.",
                                  );
                                }
                                return;
                              }
                              fileInputRefs.current[uploadKey]?.click();
                            }}
                            className={cn(
                              "flex aspect-video w-full max-w-xs flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 bg-gray-50/80 text-gray-500 transition",
                              canUploadImages &&
                                "hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700",
                              "disabled:cursor-not-allowed disabled:opacity-50",
                            )}
                          >
                            {isUploading ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <ImagePlus className="h-5 w-5" />
                                <span className="text-xs font-medium">
                                  Images
                                </span>
                              </>
                            )}
                          </button>
                        )}

                        <input
                          ref={(el) => {
                            fileInputRefs.current[uploadKey] = el;
                          }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="hidden"
                          disabled={!canUploadImages}
                          onChange={(e) =>
                            void handleUpload(
                              categoryIndex,
                              itemIndex,
                              e.target.files,
                            )
                          }
                        />

                        <div className="flex items-center gap-2">
                          <Input
                            value={item.video_url}
                            disabled={!canEditVideo}
                            title={
                              hasImages
                                ? "Remove images to add a video URL"
                                : undefined
                            }
                            onChange={(e) =>
                              updateItem(categoryIndex, itemIndex, {
                                video_url: e.target.value,
                              })
                            }
                            placeholder={
                              hasImages
                                ? "Remove images to add video"
                                : "Video URL"
                            }
                            className="h-10 flex-1 disabled:cursor-not-allowed disabled:bg-gray-50"
                          />
                          {hasVideo &&
                          canEditVideo &&
                          parseYouTubeVideoId(item.video_url) ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10 shrink-0"
                              onClick={() =>
                                setVideoPreviewUrl(item.video_url.trim())
                              }
                            >
                              <Play className="mr-1 h-3.5 w-3.5" />
                              Preview
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  onClick={() =>
                    updateCategory(categoryIndex, {
                      items: [
                        ...category.items,
                        { ...EMPTY_LEARNING_PATH_ITEM },
                      ],
                    })
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Item
                </Button>
              </div>
            </section>
          ))}
        </div>
      )}

      {lightbox ? (
        <ImageLightbox
          urls={lightbox.urls}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndexChange={(index) =>
            setLightbox((current) =>
              current ? { ...current, index } : current,
            )
          }
        />
      ) : null}

      <Modal
        open={Boolean(videoPreviewUrl)}
        onClose={() => setVideoPreviewUrl(null)}
        title="Video preview"
        className="max-w-2xl"
      >
        {videoPreviewUrl ? (
          <VideoEmbed
            key={videoPreviewUrl}
            url={videoPreviewUrl}
            autoPlay
            fullWidth
            className="mt-0"
          />
        ) : null}
      </Modal>
    </div>
  );
}
