import type { PaginationMeta } from './pagination.model';

export interface ApiResponse<T> {
    success: true;
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    meta: PaginationMeta;
}
