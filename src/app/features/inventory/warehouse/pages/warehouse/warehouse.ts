import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    signal,
    viewChild,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import type { DataGridColumn } from '../../../../../shared/components/data-grid/models/data-grid-column.model';
import type { DataGridConfig } from '../../../../../shared/components/data-grid/models/data-grid-config.model';
import type {
    DataGridAction,
    DataGridActionEvent,
} from '../../../../../shared/components/data-grid/models/data-grid-action.model';
import type { DataGridQuery } from '../../../../../shared/components/data-grid/models/data-grid-query.model';

import type {
    PaginationMeta,
    PaginationParams,
} from '../../../../../core/http/models/pagination.model';

import { PAGINATION_DEFAULTS } from '../../../../../core/http/models/pagination.model';

import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';

import { WarehousesService } from '../../services/warehouse.service';
import type { CreateWarehouse, Warehouse } from '../../models/warehouse.model';

import { DataGrid } from '../../../../../shared/components/data-grid/components/data-grid/data-grid';
import { WarehouseForm } from '../../components/warehouse-form/warehouse-form';
import { FormDialog } from '../../../../../shared/components/form-dialog/form-dialog';

import { AuthService } from '../../../../../core/auth/services/auth.service';

@Component({
    selector: 'app-warehouse',
    imports: [DataGrid, FormDialog, WarehouseForm],
    templateUrl: './warehouse.html',
    styleUrl: './warehouse.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Warehouses {
    private readonly authService = inject(AuthService);
    private readonly warehousesService = inject(WarehousesService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly warehouses = signal<Warehouse[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedWarehouse = signal<Warehouse | null>(null);

    readonly saving = signal(false);
    readonly warehouseForm = viewChild(WarehouseForm);
    readonly dialogTitle = computed(() =>
        this.selectedWarehouse() ? 'Editar bodega' : 'Nueva bodega',
    );

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<Warehouse>[] = [
        {
            field: 'code',
            header: 'Código',
            width: '150px',
        },
        {
            field: 'name',
            header: 'Nombre',
            width: '250px',
        },
        {
            field: 'description',
            header: 'Descripción',
            width: '300px',
        },
        {
            field: 'address',
            header: 'Dirección',
            width: '300px',
        },
        {
            field: 'is_active',
            header: 'Estado',
            type: 'boolean',
            width: '110px',
        },
    ];

    readonly gridConfig = computed<DataGridConfig<Warehouse>>(() => ({
        dataKey: 'warehouse_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('WAREHOUSE_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay bodegas registradas',
    }));

    readonly actions = computed<DataGridAction<Warehouse>[]>(() => {
        const actions: DataGridAction<Warehouse>[] = [];

        if (this.authService.hasPermission('WAREHOUSE_UPDATE')) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });
        }

        if (this.authService.hasPermission('WAREHOUSE_DELETE')) {
            actions.push({
                id: 'delete',
                label: 'Eliminar',
                icon: 'pi pi-trash',
                severity: 'danger',
            });
        }

        return actions;
    });

    constructor() {
        this.loadwarehouses();
    }

    loadwarehouses(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.warehousesService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.warehouses.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error('Error al cargar', 'No fue posible obtener las bodegas.');
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadwarehouses({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadwarehouses();
    }

    onAction(event: DataGridActionEvent<Warehouse>): void {
        switch (event.action) {
            case 'edit':
                this.onEdit(event.row);
                break;
            case 'delete':
                this.onDelete(event.row);
                break;
        }
    }

    onCreate(): void {
        this.selectedWarehouse.set(null);
        this.dialogVisible.set(true);

        this.warehouseForm()?.resetForm(null);
    }

    private onEdit(warehouse: Warehouse): void {
        this.selectedWarehouse.set(warehouse);
        this.dialogVisible.set(true);

        this.warehouseForm()?.resetForm(warehouse);
    }

    private onDelete(warehouse: Warehouse): void {
        this.confirmDialog.delete(
            `¿Está seguro de que desea eliminar la bodega "${warehouse.name}"?`,
            () => this.deleteBrand(warehouse.warehouse_id),
        );
    }

    private deleteBrand(warehouseId: number): void {
        this.warehousesService
            .delete(warehouseId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success('Bodega eliminada', 'La bodega se eliminó correctamente.');

                    this.loadwarehouses();
                },
                error: () => {
                    this.toast.error('Error al eliminar', 'No fue posible eliminar la bodega.');
                },
            });
    }

    saveWarehouse(): void {
        if (this.saving()) {
            return;
        }

        const payload = this.warehouseForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedWarehouse();

        this.saving.set(true);

        const request$ = selected
            ? this.warehousesService.update(selected.warehouse_id, payload)
            : this.warehousesService.create(payload as CreateWarehouse);

        request$
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.saving.set(false)),
            )
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Operación exitosa',
                        selected
                            ? 'La bodega se actualizó correctamente.'
                            : 'La bodega se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedWarehouse.set(null);

                    this.loadwarehouses();
                },
                error: (error) => {
                    const applied = this.warehouseForm()?.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error('Error al guardar', 'No fue posible guardar la bodega.');
                },
            });
    }
}
