export type DataGridActionSeverity =
    | 'primary'
    | 'secondary'
    | 'success'
    | 'info'
    | 'warn'
    | 'danger';

export interface DataGridAction<T> {
    id: string;
    label: string;
    icon?: string;
    severity?: DataGridActionSeverity;
    tooltip?: string;

    visible?: (row: T) => boolean;
    disabled?: (row: T) => boolean;
}

export interface DataGridActionEvent<T> {
    action: string;
    row: T;
}
