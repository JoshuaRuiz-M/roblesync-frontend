export type DataGridColumnType =
    | 'text'
    | 'number'
    | 'date'
    | 'datetime'
    | 'boolean'
    | 'currency'
    | 'custom';

export interface DataGridColumn<T> {
    field: Extract<keyof T, string> | (string & {});

    header: string;

    type?: DataGridColumnType;

    sortable?: boolean;
    filterable?: boolean;

    visible?: boolean;

    width?: string;
    minWidth?: string;

    align?: 'left' | 'center' | 'right';

    format?: string;

    valueGetter?: (row: T) => unknown;
}
