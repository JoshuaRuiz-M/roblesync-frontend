export type DataGridMode = 'server' | 'client';

export interface DataGridConfig<T> {
    mode?: DataGridMode;

    dataKey?: Extract<keyof T, string>;

    paginator?: boolean;
    rowsPerPageOptions?: number[];

    sortable?: boolean;
    globalSearch?: boolean;

    stripedRows?: boolean;
    showGridlines?: boolean;

    showCreate?: boolean;
    showRefresh?: boolean;

    searchDebounce?: number;
    searchPlaceholder?: string;

    emptyMessage?: string;
}
