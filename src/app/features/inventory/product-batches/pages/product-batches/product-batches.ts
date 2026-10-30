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
import { catchError, finalize, forkJoin, map, of, Subject, switchMap, tap } from 'rxjs';

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

import { ProductBatchesService } from '../../services/product-batches.service';
import type { CreateProductBatch, ProductBatch } from '../../models/product-batche.model';

import { DataGrid } from '../../../../../shared/components/data-grid/components/data-grid/data-grid';

import { FormDialog } from '../../../../../shared/components/form-dialog/form-dialog';

import { AuthService } from '../../../../../core/auth/services/auth.service';
import { ProductBatchesForm } from '../../components/product-batches-form/product-batches-form';
import { Product } from '../../../../catalog/products/models/product.model';

import { Button } from 'primeng/button';
import { ProductsService } from '../../../../catalog/products/services/products.service';

@Component({
    selector: 'app-product-batches',
    imports: [DataGrid, FormDialog, ProductBatchesForm, Button],
    templateUrl: './product-batches.html',
    styleUrl: './product-batches.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductBatches {
    private readonly authService = inject(AuthService);
    private readonly productBatchesService = inject(ProductBatchesService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly productBatches = signal<ProductBatch[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedProductBatch = signal<ProductBatch | null>(null);

    readonly saving = signal(false);
    readonly productBatchForm = viewChild(ProductBatchesForm);
    readonly dialogTitle = computed(() =>
        this.selectedProductBatch() ? 'Editar lote de producto' : 'Nuevo lote de producto',
    );

    private readonly productsService = inject(ProductsService);

    readonly productItems = signal<Product[]>([]);
    private readonly productsLoadSubject = new Subject<void>();
    readonly productsError = signal(false);
    readonly productsReady = signal(false);
    readonly loadingProducts = signal(false);

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<ProductBatch>[] = [
        {
            field: 'product_id',
            header: 'Producto',
            width: '200px',
            valueGetter: (row) => {
                const product = this.productItems().find(
                    (item) => item.product_id === row.product_id,
                );

                return product ? product.name : '';
            },
        },

        {
            field: 'batch_number',
            header: 'Número de lote',
            width: '150px',
        },
        {
            field: 'manufacturing_date',
            header: 'Fecha de fabricación',
            width: '200px',
            type: 'date',
        },
        {
            field: 'expiration_date',
            header: 'Fecha de vencimiento',
            width: '200px',
            type: 'date',
        },
        {
            field: 'is_active',
            header: 'Estado',
            type: 'boolean',
            width: '110px',
        },
    ];

    readonly gridConfig = computed<DataGridConfig<ProductBatch>>(() => ({
        dataKey: 'batch_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('PRODUCT_BATCH_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay lotes de producto registrados',
    }));

    readonly actions = computed<DataGridAction<ProductBatch>[]>(() => {
        const actions: DataGridAction<ProductBatch>[] = [];

        if (this.authService.hasPermission('PRODUCT_BATCH_UPDATE')) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });
        }

        if (this.authService.hasPermission('PRODUCT_BATCH_DELETE')) {
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
        this.loadproductBatches();
        this.setupProductItemsLoader();
        this.loadProductsItems();
    }

    loadproductBatches(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.productBatchesService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.productBatches.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error(
                        'Error al cargar',
                        'No fue posible obtener los lotes de producto.',
                    );
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadproductBatches({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadproductBatches();
    }

    onAction(event: DataGridActionEvent<ProductBatch>): void {
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
        this.selectedProductBatch.set(null);
        this.productItems.set([]);
        this.dialogVisible.set(true);
        this.loadingProducts.set(false);

        this.productBatchForm()?.resetForm(null);
        this.loadProductsItems();
    }

    private onEdit(productBatch: ProductBatch): void {
        this.selectedProductBatch.set(productBatch);
        this.productItems.set([]);
        this.dialogVisible.set(true);
        this.loadingProducts.set(false);

        this.productBatchForm()?.resetForm(productBatch);
        this.loadProductsItems();
    }

    private onDelete(productBatch: ProductBatch): void {
        this.confirmDialog.delete(
            `¿Está seguro de que desea eliminar el lote de producto "${productBatch.batch_number}"?`,
            () => this.deleteProductBatch(productBatch.batch_id),
        );
    }

    private deleteProductBatch(productBatchId: number): void {
        this.productBatchesService
            .delete(productBatchId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Lote del producto eliminado',
                        'El lote del producto se eliminó correctamente.',
                    );

                    this.loadproductBatches();
                },
                error: () => {
                    this.toast.error(
                        'Error al eliminar',
                        'No fue posible eliminar el lote del producto.',
                    );
                },
            });
    }

    saveProductBatch(): void {
        if (this.saving()) {
            return;
        }

        const payload = this.productBatchForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedProductBatch();

        this.saving.set(true);

        const request$ = selected
            ? this.productBatchesService.update(selected.batch_id, payload)
            : this.productBatchesService.create(payload as CreateProductBatch);

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
                            ? 'El lote del producto se actualizó correctamente.'
                            : 'El lote del producto se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedProductBatch.set(null);

                    this.loadproductBatches();
                },
                error: (error) => {
                    const applied = this.productBatchForm()?.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error(
                        'Error al guardar',
                        'No fue posible guardar el lote del producto.',
                    );
                },
            });
    }

    loadProductsItems(): void {
        this.productsLoadSubject.next();
    }

    private setupProductItemsLoader(): void {
        this.productsLoadSubject
            .pipe(
                tap(() => {
                    this.loadingProducts.set(true);
                    this.productsError.set(false);
                    this.productsReady.set(false);
                    this.productItems.set([]);
                }),
                switchMap(() =>
                    this.productsService.getAll({ page: 1, limit: 100 }).pipe(
                        switchMap((firstPage) => {
                            const totalPages = firstPage.meta.totalPages;

                            if (totalPages <= 1) {
                                return of(firstPage.data);
                            }

                            const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
                                this.productsService.getAll({
                                    page: index + 2,
                                    limit: 100,
                                }),
                            );

                            return forkJoin(requests).pipe(
                                map((responses) => [
                                    ...firstPage.data,
                                    ...responses.flatMap((response) => response.data),
                                ]),
                            );
                        }),
                        map((items) => ({
                            items,
                            failed: false as const,
                        })),
                        catchError(() =>
                            of({
                                items: [] as Product[],
                                failed: true as const,
                            }),
                        ),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((result) => {
                this.loadingProducts.set(false);

                if (result.failed) {
                    this.productsError.set(true);
                    this.productsReady.set(false);
                    this.productItems.set([]);

                    this.toast.error(
                        'Error al cargar productos',
                        'No fue posible obtener los productos.',
                    );

                    return;
                }

                this.productItems.set(result.items);
                this.productsReady.set(true);
            });
    }
}
