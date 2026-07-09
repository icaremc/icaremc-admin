"use client";

import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import {
  parseYouTubeVideoId,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
} from "@/lib/content/youtube";
import { cn } from "@/lib/utils";

type VideoEmbedProps = {
  url: string;
  className?: string;
  /** Start playing immediately (e.g. inside a preview modal). */
  autoPlay?: boolean;
  /** Stretch to container width instead of max-w-xs. */
  fullWidth?: boolean;
};

/** Compact YouTube preview with click-to-play; falls back to a link for other URLs. */
export function VideoEmbed({
  url,
  className,
  autoPlay = false,
  fullWidth = false,
}: VideoEmbedProps) {
  const trimmed = url.trim();
  const videoId = parseYouTubeVideoId(trimmed);
  const [playing, setPlaying] = useState(autoPlay);

  if (!trimmed) return null;

  if (!videoId) {
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "mt-2 inline-flex max-w-full items-center gap-1.5 break-all text-xs font-medium text-sky-700 hover:underline",
          className,
        )}
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        {trimmed}
      </a>
    );
  }

  return (
    <div
      className={cn(
        "mt-2 w-full",
        !fullWidth && "max-w-xs",
        className,
      )}
    >
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
        {playing ? (
          <div className="aspect-video w-full">
            <iframe
              src={youtubeEmbedUrl(videoId)}
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group relative block aspect-video w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
            aria-label="Play video"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={youtubeThumbnailUrl(videoId)}
              alt=""
              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-black/25 transition group-hover:bg-black/35" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition group-hover:scale-105 group-hover:bg-red-500">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
