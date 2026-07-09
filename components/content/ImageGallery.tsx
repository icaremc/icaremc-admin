"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageLightboxProps = {
  urls: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function ImageLightbox({
  urls,
  index,
  onClose,
  onIndexChange,
}: ImageLightboxProps) {
  const current = urls[index];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && urls.length > 1) {
        onIndexChange((index - 1 + urls.length) % urls.length);
      }
      if (event.key === "ArrowRight" && urls.length > 1) {
        onIndexChange((index + 1) % urls.length);
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, urls.length, onClose, onIndexChange]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/85"
        aria-label="Close preview"
        onClick={onClose}
      />

      <div className="relative z-10 flex h-full w-full max-w-5xl flex-col p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3 text-white">
          <p className="text-sm font-medium text-white/80">
            {index + 1} / {urls.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          {urls.length > 1 ? (
            <button
              type="button"
              onClick={() =>
                onIndexChange((index - 1 + urls.length) % urls.length)
              }
              className="absolute left-0 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:left-2"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : null}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />

          {urls.length > 1 ? (
            <button
              type="button"
              onClick={() => onIndexChange((index + 1) % urls.length)}
              className="absolute right-0 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:right-2"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          ) : null}
        </div>

        {urls.length > 1 ? (
          <div className="mt-4 flex justify-center gap-2 overflow-x-auto pb-1">
            {urls.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => onIndexChange(i)}
                className={cn(
                  "h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition",
                  i === index
                    ? "border-white"
                    : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ImageGalleryProps = {
  urls: string[];
  className?: string;
};

/** Compact proportional carousel with fullscreen lightbox (detail views). */
export function ImageGallery({ urls, className }: ImageGalleryProps) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (urls.length === 0) return null;

  const safeIndex = Math.min(index, urls.length - 1);
  const current = urls[safeIndex];
  const hasMultiple = urls.length > 1;

  const goPrev = () =>
    setIndex((currentIndex) => (currentIndex - 1 + urls.length) % urls.length);
  const goNext = () =>
    setIndex((currentIndex) => (currentIndex + 1) % urls.length);

  return (
    <>
      <div className={cn("mt-2 w-full max-w-xs", className)}>
        <div className="group relative aspect-video overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
            aria-label="Open image fullscreen"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt=""
              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
            />
          </button>

          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

          {hasMultiple ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goPrev();
                }}
                className="absolute left-1.5 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white shadow-sm transition hover:bg-black/75"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goNext();
                }}
                className="absolute right-1.5 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white shadow-sm transition hover:bg-black/75"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="absolute bottom-1.5 left-1/2 z-[2] -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                {safeIndex + 1} / {urls.length}
              </span>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="absolute bottom-1.5 right-1.5 z-[2] inline-flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-1 text-[10px] font-medium text-gray-800 opacity-0 shadow-sm transition group-hover:opacity-100"
          >
            <Expand className="h-3 w-3" />
            View
          </button>
        </div>
      </div>

      {lightboxOpen ? (
        <ImageLightbox
          urls={urls}
          index={safeIndex}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setIndex}
        />
      ) : null}
    </>
  );
}
