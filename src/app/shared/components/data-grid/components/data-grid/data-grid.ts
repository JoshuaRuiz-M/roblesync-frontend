import { Component, computed, input, output, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';

import { TableModule, type TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';

import type { PaginationMeta } from '../../../../../core/http/models/pagination.model';
import { PAGINATION_DEFAULTS } from '../../../../../core/http/models/pagination.model';

import { EmptyState } from '../../../empty-state/empty-state';
import { ErrorState } from '../../../error-state/error-state';

import type { DataGridColumn } from './../../models/data-grid-column.model';
import type { DataGridConfig } from './../../models/data-grid-config.model';
import type { DataGridQuery, DataGridSort } from './../../models/data-grid-query.model';
import type { DataGridAction, DataGridActionEvent } from './../../models/data-grid-action.model';
import { TooltipModule } from 'primeng/tooltip';

@Component({
    selector: 'app-data-grid',
    imports: [
        FormsModule,
        DatePipe,
        DecimalPipe,
        TableModule,
        ButtonModule,
        InputTextModule,
        TagModule,
        EmptyState,
        ErrorState,
        TooltipModule,
    ],
    templateUrl: './data-grid.html',
    styleUrl: './data-grid.scss',
})
export class DataGrid<T extends object> {
    readonly data = input.required<T[]>();
    readonly columns = input.required<DataGridColumn<T>[]>();
    readonly pagination = input.required<PaginationMeta>();

    readonly config = input<DataGridConfig<T>>({});
    readonly actions = input<DataGridAction<T>[]>([]);

    readonly loading = input(false);
    readonly error = input(false);

    readonly queryChange = output<DataGridQuery>();
    readonly actionClick = output<DataGridActionEvent<T>>();
    readonly create = output<void>();
    readonly refresh = output<void>();

    readonly searchValue = signal('');
    readonly sortState = signal<DataGridSort[]>([]);

    private searchTimer: ReturnType<typeof setTimeout> | null = null;

    readonly settings = computed(() => ({
        paginator: true,
        rowsPerPageOptions: [5, 10, 20, 50],
        sortable: false,
        globalSearch: false,
        stripedRows: true,
        showGridlines: false,
        showCreate: false,
        showRefresh: true,
        searchDebounce: 400,
        searchPlaceholder: 'Buscar...',
        emptyMessage: 'No hay registros disponibles',
        ...this.config(),
    }));

    readonly visibleColumns = computed(() =>
        this.columns().filter((column) => column.visible !== false),
    );

    readonly first = computed(() => {
        const { page, limit } = this.pagination();

        return (page - 1) * limit;
    });

    readonly hasActions = computed(() => this.actions().length > 0);

    readonly columnCount = computed(
        () => this.visibleColumns().length + (this.hasActions() ? 1 : 0),
    );

    readonly sortField = computed(() => this.sortState()[0]?.field ?? '');

    readonly sortOrder = computed(() => {
        const order = this.sortState()[0]?.order;

        return order === 'asc' ? 1 : order === 'desc' ? -1 : 0;
    });

    onPageChange(event: TablePageEvent): void {
        const limit = event.rows ?? PAGINATION_DEFAULTS.LIMIT;
        const first = event.first ?? 0;

        this.emitQuery({
            page: Math.floor(first / limit) + 1,
            limit,
        });
    }

    onSort(field: string): void {
        if (!this.settings().sortable) {
            return;
        }

        const column = this.visibleColumns().find((item) => item.field === field);

        if (!column?.sortable) {
            return;
        }

        const current = this.sortState()[0];

        let next: DataGridSort[] = [];

        if (!current || current.field !== field) {
            next = [{ field, order: 'asc' }];
        } else if (current.order === 'asc') {
            next = [{ field, order: 'desc' }];
        }

        this.sortState.set(next);

        this.emitQuery({ page: 1 });
    }

    onSearch(value: string): void {
        this.searchValue.set(value);

        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }

        this.searchTimer = setTimeout(() => {
            this.searchTimer = null;
            this.emitQuery({ page: 1 });
        }, this.settings().searchDebounce);
    }

    onRefresh(): void {
        this.refresh.emit();
    }

    onCreate(): void {
        this.create.emit();
    }

    onAction(action: DataGridAction<T>, row: T): void {
        if (action.disabled?.(row)) {
            return;
        }

        this.actionClick.emit({
            action: action.id,
            row,
        });
    }

    isActionVisible(action: DataGridAction<T>, row: T): boolean {
        return action.visible?.(row) ?? true;
    }

    getValue(row: T, column: DataGridColumn<T>): unknown {
        if (column.valueGetter) {
            return column.valueGetter(row);
        }

        return column.field.split('.').reduce<unknown>((value, key) => {
            if (value === null || typeof value !== 'object') {
                return undefined;
            }

            return (value as Record<string, unknown>)[key];
        }, row);
    }

    private emitQuery(overrides: Partial<DataGridQuery> = {}): void {
        const pagination = this.pagination();
        const search = this.searchValue().trim();

        this.queryChange.emit({
            page: pagination.page,
            limit: pagination.limit,
            ...(search ? { search } : {}),
            ...(this.sortState().length ? { sort: this.sortState() } : {}),
            ...overrides,
        });
    }

    asDateValue(value: unknown): string | number | Date | null {
        if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
            return value;
        }

        return null;
    }

    asNumberValue(value: unknown): number | null {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        return null;
    }
}
