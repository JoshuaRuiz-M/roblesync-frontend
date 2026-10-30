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

import { ProductLinesService } from '../../services/product-lines.service';
import type { CreateProductLine, ProductLine } from '../../models/product-line.model';

import { DataGrid } from '../../../../../shared/components/data-grid/components/data-grid/data-grid';

import { FormDialog } from '../../../../../shared/components/form-dialog/form-dialog';

import { AuthService } from '../../../../../core/auth/services/auth.service';
import { ProductLinesForm } from '../../components/product-lines-form/product-lines-form';
import { Category } from '../../../categories/models/category.model';
import { CategoriesService } from '../../../categories/services/categories.service';
import { Button } from 'primeng/button';

@Component({
    selector: 'app-product-lines',
    imports: [DataGrid, FormDialog, ProductLinesForm, Button],
    templateUrl: './product-lines.html',
    styleUrl: './product-lines.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductLines {
    private readonly authService = inject(AuthService);
    private readonly productLinesService = inject(ProductLinesService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly productLines = signal<ProductLine[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedProductLine = signal<ProductLine | null>(null);

    readonly saving = signal(false);
    readonly productLineForm = viewChild(ProductLinesForm);
    readonly dialogTitle = computed(() =>
        this.selectedProductLine() ? 'Editar línea de producto' : 'Nueva línea de producto',
    );

    private readonly categoriesService = inject(CategoriesService);

    readonly categoryItems = signal<Category[]>([]);
    private readonly categoriesLoadSubject = new Subject<void>();
    readonly categoriesError = signal(false);
    readonly categoriesReady = signal(false);
    readonly loadingCategories = signal(false);

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<ProductLine>[] = [
        {
            field: 'category_id',
            header: 'Categoría',
            width: '200px',
            valueGetter: (row) => {
                const category = this.categoryItems().find(
                    (item) => item.category_id === row.category_id,
                );

                return category ? category.name : '';
            },
        },
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

    readonly gridConfig = computed<DataGridConfig<ProductLine>>(() => ({
        dataKey: 'product_line_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('PRODUCT_LINE_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay líneas de producto registradas',
    }));

    readonly actions = computed<DataGridAction<ProductLine>[]>(() => {
        const actions: DataGridAction<ProductLine>[] = [];

        if (this.authService.hasPermission('PRODUCT_LINE_UPDATE')) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });
        }

        if (this.authService.hasPermission('PRODUCT_LINE_DELETE')) {
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
        this.loadproductLines();
        this.setupCategoryItemsLoader();
        this.loadCategoriesItems();
    }

    loadproductLines(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.productLinesService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.productLines.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error(
                        'Error al cargar',
                        'No fue posible obtener las líneas de producto.',
                    );
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadproductLines({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadproductLines();
    }

    onAction(event: DataGridActionEvent<ProductLine>): void {
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
        this.selectedProductLine.set(null);
        this.categoryItems.set([]);
        this.dialogVisible.set(true);

        this.productLineForm()?.resetForm(null);
        this.loadCategoriesItems();
    }

    private onEdit(productLine: ProductLine): void {
        this.selectedProductLine.set(productLine);
        this.categoryItems.set([]);
        this.dialogVisible.set(true);

        this.productLineForm()?.resetForm(productLine);
        this.loadCategoriesItems();
    }

    private onDelete(productLine: ProductLine): void {
        this.confirmDialog.delete(
            `¿Está seguro de que desea eliminar la línea de producto "${productLine.name}"?`,
            () => this.deleteProductLine(productLine.product_line_id),
        );
    }

    private deleteProductLine(productLineId: number): void {
        this.productLinesService
            .delete(productLineId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Línea de producto eliminada',
                        'La línea de producto se eliminó correctamente.',
                    );

                    this.loadproductLines();
                },
                error: () => {
                    this.toast.error(
                        'Error al eliminar',
                        'No fue posible eliminar la línea de producto.',
                    );
                },
            });
    }

    saveProductLine(): void {
        if (this.saving()) {
            return;
        }

        const payload = this.productLineForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedProductLine();

        this.saving.set(true);

        const request$ = selected
            ? this.productLinesService.update(selected.product_line_id, payload)
            : this.productLinesService.create(payload as CreateProductLine);

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
                            ? 'La línea de producto se actualizó correctamente.'
                            : 'La línea de producto se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedProductLine.set(null);

                    this.loadproductLines();
                },
                error: (error) => {
                    const applied = this.productLineForm()?.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error(
                        'Error al guardar',
                        'No fue posible guardar la línea de producto.',
                    );
                },
            });
    }

    loadCategoriesItems(): void {
        this.categoriesLoadSubject.next();
    }

    private setupCategoryItemsLoader(): void {
        this.categoriesLoadSubject
            .pipe(
                tap(() => {
                    this.loadingCategories.set(true);
                    this.categoriesError.set(false);
                    this.categoriesReady.set(false);
                    this.categoryItems.set([]);
                }),
                switchMap(() =>
                    this.categoriesService.getAll({ page: 1, limit: 100 }).pipe(
                        switchMap((firstPage) => {
                            const totalPages = firstPage.meta.totalPages;

                            if (totalPages <= 1) {
                                return of(firstPage.data);
                            }

                            const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
                                this.categoriesService.getAll({
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
                                items: [] as Category[],
                                failed: true as const,
                            }),
                        ),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((result) => {
                this.loadingCategories.set(false);

                if (result.failed) {
                    this.categoriesError.set(true);
                    this.categoriesReady.set(false);
                    this.categoryItems.set([]);

                    this.toast.error(
                        'Error al cargar categorías',
                        'No fue posible obtener las categorías.',
                    );

                    return;
                }

                this.categoryItems.set(result.items);
                this.categoriesReady.set(true);
            });
    }
}
