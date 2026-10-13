export const DEFAULT_PAGE_SIZE = 50;

export type ListPageMeta = {
  total: number | null;
  offset: number;
  limit: number;
  hasMore: boolean;
};
