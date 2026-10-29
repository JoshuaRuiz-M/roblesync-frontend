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

import { SuppliersService } from '../../services/suppliers.service';
import type { CreateSupplier, Supplier } from '../../models/supplier.model';

import { DataGrid } from '../../../../../shared/components/data-grid/components/data-grid/data-grid';
import { SupplierForm } from '../../components/supplier-form/supplier-form';
import { FormDialog } from '../../../../../shared/components/form-dialog/form-dialog';

import { AuthService } from '../../../../../core/auth/services/auth.service';

@Component({
    selector: 'app-suppliers',
    imports: [DataGrid, FormDialog, SupplierForm],
    templateUrl: './suppliers.html',
    styleUrl: './suppliers.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Suppliers {
    private readonly authService = inject(AuthService);
    private readonly suppliersService = inject(SuppliersService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly suppliers = signal<Supplier[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedSupplier = signal<Supplier | null>(null);

    readonly saving = signal(false);
    readonly SupplierForm = viewChild(SupplierForm);
    readonly dialogTitle = computed(() =>
        this.selectedSupplier() ? 'Editar proveedor' : 'Nuevo proveedor',
    );

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<Supplier>[] = [
        {
            field: 'tax_id',
            header: 'NIT',
            width: '150px',
        },
        {
            field: 'business_name',
            header: 'Razón Social',
            width: '250px',
        },
        {
            field: 'contact_name',
            header: 'Contacto',
            width: '200px',
        },
        {
            field: 'phone',
            header: 'Teléfono',
            width: '150px',
        },
        {
            field: 'email',
            header: 'Correo electrónico',
            width: '250px',
        },
        {
            field: 'address',
            header: 'Dirección',
            width: '300px',
        },
        {
            field: 'credit_days',
            header: 'Días de crédito',
            width: '150px',
        },
        {
            field: 'credit_limit',
            header: 'Límite de crédito',
            width: '150px',
        },
        {
            field: 'is_active',
            header: 'Activo',
            width: '100px',
        },
    ];

    readonly gridConfig = computed<DataGridConfig<Supplier>>(() => ({
        dataKey: 'supplier_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('SUPPLIER_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay proveedores registrados',
    }));

    readonly actions = computed<DataGridAction<Supplier>[]>(() => {
        const actions: DataGridAction<Supplier>[] = [];

        if (this.authService.hasPermission('SUPPLIER_UPDATE')) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });
        }

        if (this.authService.hasPermission('SUPPLIER_DELETE')) {
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
        this.loadSuppliers();
    }

    loadSuppliers(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.suppliersService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.suppliers.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error('Error al cargar', 'No fue posible obtener los proveedores.');
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadSuppliers({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadSuppliers();
    }

    onAction(event: DataGridActionEvent<Supplier>): void {
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
        this.selectedSupplier.set(null);
        this.dialogVisible.set(true);

        this.SupplierForm()?.resetForm(null);
    }

    private onEdit(supplier: Supplier): void {
        this.selectedSupplier.set(supplier);
        this.dialogVisible.set(true);

        this.SupplierForm()?.resetForm(supplier);
    }

    private onDelete(supplier: Supplier): void {
        this.confirmDialog.delete(
            `¿Está seguro de que desea eliminar el proveedor "${supplier.business_name}"?`,
            () => this.deleteSupplier(supplier.supplier_id),
        );
    }

    private deleteSupplier(supplierId: number): void {
        this.suppliersService
            .delete(supplierId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Proveedor eliminado',
                        'El proveedor se eliminó correctamente.',
                    );

                    this.loadSuppliers();
                },
                error: () => {
                    this.toast.error('Error al eliminar', 'No fue posible eliminar el proveedor.');
                },
            });
    }

    saveSupplier(): void {
        if (this.saving()) {
            return;
        }

        const payload = this.SupplierForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedSupplier();

        this.saving.set(true);

        const request$ = selected
            ? this.suppliersService.update(selected.supplier_id, payload)
            : this.suppliersService.create(payload as CreateSupplier);

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
                            ? 'El proveedor se actualizó correctamente.'
                            : 'El proveedor se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedSupplier.set(null);

                    this.loadSuppliers();
                },
                error: (error) => {
                    const applied = this.SupplierForm()?.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error('Error al guardar', 'No fue posible guardar el proveedor.');
                },
            });
    }
}
