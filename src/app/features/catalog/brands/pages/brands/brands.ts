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

import { BrandsService } from '../../services/brands.service';
import type { CreateBrand, Brand } from '../../models/brand.model';

import { DataGrid } from '../../../../../shared/components/data-grid/components/data-grid/data-grid';
import { BrandForm } from '../../components/brand-form/brand-form';
import { FormDialog } from '../../../../../shared/components/form-dialog/form-dialog';

import { AuthService } from '../../../../../core/auth/services/auth.service';

@Component({
    selector: 'app-brands',
    imports: [DataGrid, FormDialog, BrandForm],
    templateUrl: './brands.html',
    styleUrl: './brands.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Brands {
    private readonly authService = inject(AuthService);
    private readonly brandsService = inject(BrandsService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly brands = signal<Brand[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedBrand = signal<Brand | null>(null);

    readonly saving = signal(false);
    readonly brandForm = viewChild(BrandForm);
    readonly dialogTitle = computed(() => (this.selectedBrand() ? 'Editar marca' : 'Nueva marca'));

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<Brand>[] = [
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
            field: 'is_active',
            header: 'Estado',
            type: 'boolean',
            width: '110px',
        },
    ];

    readonly gridConfig = computed<DataGridConfig<Brand>>(() => ({
        dataKey: 'brand_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('BRAND_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay marcas registrados',
    }));

    readonly actions = computed<DataGridAction<Brand>[]>(() => {
        const actions: DataGridAction<Brand>[] = [];

        if (this.authService.hasPermission('BRAND_UPDATE')) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });
        }

        if (this.authService.hasPermission('BRAND_DELETE')) {
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
        this.loadbrands();
    }

    loadbrands(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.brandsService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.brands.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error('Error al cargar', 'No fue posible obtener las marcas.');
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadbrands({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadbrands();
    }

    onAction(event: DataGridActionEvent<Brand>): void {
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
        this.selectedBrand.set(null);
        this.dialogVisible.set(true);

        this.brandForm()?.resetForm(null);
    }

    private onEdit(brand: Brand): void {
        this.selectedBrand.set(brand);
        this.dialogVisible.set(true);

        this.brandForm()?.resetForm(brand);
    }

    private onDelete(brand: Brand): void {
        this.confirmDialog.delete(
            `¿Está seguro de que desea eliminar la marca "${brand.name}"?`,
            () => this.deleteBrand(brand.brand_id),
        );
    }

    private deleteBrand(brandId: number): void {
        this.brandsService
            .delete(brandId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success('Marca eliminada', 'La marca se eliminó correctamente.');

                    this.loadbrands();
                },
                error: () => {
                    this.toast.error('Error al eliminar', 'No fue posible eliminar la marca.');
                },
            });
    }

    saveBrand(): void {
        if (this.saving()) {
            return;
        }

        const payload = this.brandForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedBrand();

        this.saving.set(true);

        const request$ = selected
            ? this.brandsService.update(selected.brand_id, payload)
            : this.brandsService.create(payload as CreateBrand);

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
                            ? 'La marca se actualizó correctamente.'
                            : 'La marca se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedBrand.set(null);

                    this.loadbrands();
                },
                error: (error) => {
                    const applied = this.brandForm()?.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error('Error al guardar', 'No fue posible guardar la marca.');
                },
            });
    }
}
