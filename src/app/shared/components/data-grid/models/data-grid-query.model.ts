import type { PaginationParams } from '../../../../core/http/models/pagination.model';

export type DataGridSortOrder = 'asc' | 'desc';

export interface DataGridSort {
    field: string;
    order: DataGridSortOrder;
}

export interface DataGridFilter {
    field: string;
    operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'gt' | 'gte' | 'lt' | 'lte';
    value: string | number | boolean | null;
}

export interface DataGridQuery extends PaginationParams {
    search?: string;
    sort?: DataGridSort[];
    filters?: DataGridFilter[];
}
