"use client";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_PAGE_SIZE,
  type ListPageMeta,
} from "@/lib/listPagination";

export { DEFAULT_PAGE_SIZE, type ListPageMeta };

type OffsetProps = {
  mode?: "offset";
  offset: number;
  limit: number;
  count: number;
  total?: number | null;
  loading?: boolean;
  onOffsetChange: (offset: number) => void;
};

type LoadMoreProps = {
  mode: "load-more";
  count: number;
  hasMore: boolean;
  loading?: boolean;
  onLoadMore: () => void;
};

type Props = OffsetProps | LoadMoreProps;

export function ListPagination(props: Props) {
  if (props.mode === "load-more") {
    if (!props.hasMore && props.count === 0) return null;
    return (
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Showing {props.count} {props.count === 1 ? "item" : "items"}
        </p>
        {props.hasMore ? (
          <Button
            type="button"
            variant="outline"
            disabled={props.loading}
            onClick={props.onLoadMore}
          >
            {props.loading ? "Loading…" : "Load more"}
          </Button>
        ) : null}
      </div>
    );
  }

  const total = props.total ?? null;
  const hasMore =
    total != null ? props.offset + props.count < total : props.count >= props.limit;
  const canPrev = props.offset > 0;
  if (!canPrev && !hasMore && props.count === 0) return null;

  const from = props.count === 0 ? 0 : props.offset + 1;
  const to = props.offset + props.count;
  const label =
    total != null
      ? `Showing ${from}–${to} of ${total}`
      : props.count === 0
        ? "No results"
        : `Showing ${from}–${to}`;

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm text-gray-600">{label}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!canPrev || props.loading}
          onClick={() =>
            props.onOffsetChange(Math.max(0, props.offset - props.limit))
          }
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!hasMore || props.loading}
          onClick={() => props.onOffsetChange(props.offset + props.limit)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
