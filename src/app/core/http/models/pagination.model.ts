export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginationMeta extends PaginationParams {
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export const PAGINATION_DEFAULTS = {
    PAGE: 1,
    LIMIT: 10,
    MAX_LIMIT: 100,
} as const;
