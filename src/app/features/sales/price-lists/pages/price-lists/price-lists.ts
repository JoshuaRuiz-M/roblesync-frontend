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
import { catchError, finalize, forkJoin, map, Observable, of, Subject, switchMap, tap } from 'rxjs';

import { ButtonModule } from 'primeng/button';

import { AuthService } from '../../../../../core/auth/services/auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';

import {
    PAGINATION_DEFAULTS,
    type PaginationMeta,
    type PaginationParams,
} from '../../../../../core/http/models/pagination.model';

import type { PaginatedResponse } from '../../../../../core/http/models/api-response.model';

import { DataGrid } from '../../../../../shared/components/data-grid/components/data-grid/data-grid';
import type { DataGridColumn } from '../../../../../shared/components/data-grid/models/data-grid-column.model';
import type { DataGridConfig } from '../../../../../shared/components/data-grid/models/data-grid-config.model';
import type {
    DataGridAction,
    DataGridActionEvent,
} from '../../../../../shared/components/data-grid/models/data-grid-action.model';
import type { DataGridQuery } from '../../../../../shared/components/data-grid/models/data-grid-query.model';

import { FormDialog } from '../../../../../shared/components/form-dialog/form-dialog';

import { ProductsService } from '../../../../catalog/products/services/products.service';
import type { Product } from '../../../../catalog/products/models/product.model';

import { PriceListsService } from '../../services/price-lists.service';
import type {
    CreatePriceList,
    PriceList,
    PriceListWithDetails,
    UpdatePriceList,
} from '../../models/price-list.model';

import { PriceListsForm } from '../../components/price-lists-form/price-lists-form';
import { getProblemDetails } from '../../../../../core/http/utils/problem-details.util';
import { PriceListDetails } from '../../components/price-list-details/price-list-details';

@Component({
    selector: 'app-price-lists',
    imports: [DataGrid, FormDialog, ButtonModule, PriceListsForm, PriceListDetails],
    templateUrl: './price-lists.html',
    styleUrl: './price-lists.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceLists {
    private readonly authService = inject(AuthService);
    private readonly priceListsService = inject(PriceListsService);
    private readonly productsService = inject(ProductsService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly priceLists = signal<PriceList[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedPriceList = signal<PriceListWithDetails | null>(null);
    readonly saving = signal(false);
    readonly priceListForm = viewChild(PriceListsForm);

    readonly detailsVisible = signal(false);
    readonly selectedDetailsPriceList = signal<PriceListWithDetails | null>(null);

    readonly productItems = signal<Product[]>([]);
    readonly loadingCatalogs = signal(false);
    readonly catalogsError = signal(false);
    readonly catalogsReady = signal(false);

    readonly loadingPriceList = signal(false);
    readonly processingPriceListId = signal<number | null>(null);

    private readonly catalogsLoadSubject = new Subject<void>();

    readonly canCreate = computed(() => this.authService.hasPermission('PRICE_LIST_CREATE'));

    readonly canEdit = computed(() => this.authService.hasPermission('PRICE_LIST_UPDATE'));

    readonly canDelete = computed(() => this.authService.hasPermission('PRICE_LIST_DELETE'));

    readonly dialogTitle = computed(() =>
        this.selectedPriceList()
            ? `Editar lista ${this.selectedPriceList()!.code}`
            : 'Nueva lista de precios',
    );

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<PriceList>[] = [
        {
            field: 'code',
            header: 'Código',
            width: '160px',
        },
        {
            field: 'name',
            header: 'Nombre',
            width: '240px',
        },
        {
            field: 'description',
            header: 'Descripción',
            width: '300px',
            valueGetter: (row) => row.description || 'Sin descripción',
        },
        {
            field: 'is_active',
            header: 'Estado',
            width: '130px',
            valueGetter: (row) => (row.is_active ? 'Activa' : 'Inactiva'),
        },
        {
            field: 'created_at',
            header: 'Fecha de creación',
            width: '170px',
            valueGetter: (row) => this.formatDate(row.created_at),
        },
    ];

    readonly gridConfig = computed<DataGridConfig<PriceList>>(() => ({
        dataKey: 'price_list_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.canCreate(),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay listas de precios registradas',
    }));

    readonly actions = computed<DataGridAction<PriceList>[]>(() => {
        const actions: DataGridAction<PriceList>[] = [
            {
                id: 'view',
                label: 'Ver detalles',
                icon: 'pi pi-eye',
                severity: 'secondary',
            },
        ];

        if (this.canEdit()) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });
        }

        if (this.canDelete()) {
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
        this.setupCatalogsLoader();
        this.loadPriceLists();
        this.loadCatalogs();
    }

    loadPriceLists(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.priceListsService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.priceLists.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);
                    this.priceLists.set([]);

                    this.toast.error(
                        'Error al cargar',
                        'No fue posible obtener las listas de precios.',
                    );
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadPriceLists({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadPriceLists();
        this.loadCatalogs();
    }

    onAction(event: DataGridActionEvent<PriceList>): void {
        switch (event.action) {
            case 'view':
                this.onView(event.row);
                break;

            case 'edit':
                this.onEdit(event.row);
                break;

            case 'delete':
                this.onDelete(event.row);
                break;
        }
    }

    onCreate(): void {
        if (!this.canCreate()) {
            return;
        }

        this.selectedPriceList.set(null);
        this.dialogVisible.set(true);

        if (!this.catalogsReady() && !this.loadingCatalogs()) {
            this.loadCatalogs();
        }
    }

    onEdit(priceList: PriceList): void {
        if (!this.canEdit()) {
            return;
        }

        this.loadPriceList(priceList.price_list_id, 'edit');
    }

    onView(priceList: PriceList): void {
        this.loadPriceList(priceList.price_list_id, 'view');
    }

    onEditFromDetails(priceList: PriceListWithDetails): void {
        if (!this.canEdit()) {
            return;
        }

        this.detailsVisible.set(false);
        this.selectedDetailsPriceList.set(null);
        this.selectedPriceList.set(priceList);
        this.dialogVisible.set(true);

        if (!this.catalogsReady() && !this.loadingCatalogs()) {
            this.loadCatalogs();
        }
    }

    private loadPriceList(id: number, mode: 'view' | 'edit'): void {
        if (this.loadingPriceList()) {
            return;
        }

        this.loadingPriceList.set(true);

        this.priceListsService
            .getWithDetails(id)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loadingPriceList.set(false)),
            )
            .subscribe({
                next: (priceList) => {
                    if (mode === 'view') {
                        this.selectedDetailsPriceList.set(priceList);
                        this.detailsVisible.set(true);
                        return;
                    }

                    this.selectedPriceList.set(priceList);
                    this.dialogVisible.set(true);

                    if (!this.catalogsReady() && !this.loadingCatalogs()) {
                        this.loadCatalogs();
                    }
                },
                error: () => {
                    this.toast.error(
                        'Error al cargar',
                        'No fue posible obtener los detalles de la lista.',
                    );
                },
            });
    }

    savePriceList(): void {
        if (this.saving() || !this.catalogsReady()) {
            return;
        }

        const payload = this.priceListForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedPriceList();

        if (selected && !this.canEdit()) {
            return;
        }

        if (!selected && !this.canCreate()) {
            return;
        }

        this.saving.set(true);

        const request$ = selected
            ? this.priceListsService.update(selected.price_list_id, payload as UpdatePriceList)
            : this.priceListsService.create(payload as CreatePriceList);

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
                            ? 'La lista de precios se actualizó correctamente.'
                            : 'La lista de precios se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedPriceList.set(null);
                    this.loadPriceLists();
                },
                error: (error) => {
                    if (this.priceListForm()?.applyValidationErrors(error)) {
                        return;
                    }

                    const problem = getProblemDetails(error);

                    this.toast.error(
                        'Error al guardar',
                        problem?.detail ?? 'No fue posible guardar la lista de precios.',
                    );
                },
            });
    }

    onDelete(priceList: PriceList): void {
        if (!this.canDelete() || this.processingPriceListId() !== null) {
            return;
        }

        this.confirmDialog.confirm({
            header: 'Eliminar lista de precios',
            message: `¿Está seguro de que desea eliminar la lista "${priceList.name}" (${priceList.code})? También se eliminarán todos sus productos y precios asociados. Esta acción no se puede deshacer.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonSeverity: 'danger',
            accept: () => this.deletePriceList(priceList.price_list_id),
        });
    }

    private deletePriceList(id: number): void {
        if (this.processingPriceListId() !== null) {
            return;
        }

        this.processingPriceListId.set(id);

        this.priceListsService
            .delete(id)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.processingPriceListId.set(null)),
            )
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Lista eliminada',
                        'La lista de precios y sus detalles se eliminaron correctamente.',
                    );

                    if (this.selectedDetailsPriceList()?.price_list_id === id) {
                        this.detailsVisible.set(false);
                        this.selectedDetailsPriceList.set(null);
                    }

                    const currentPage = this.pagination().page;
                    const nextPage =
                        this.priceLists().length === 1 && currentPage > 1
                            ? currentPage - 1
                            : currentPage;

                    this.loadPriceLists({
                        page: nextPage,
                        limit: this.pagination().limit,
                    });
                },
                error: (error) => {
                    const problem = getProblemDetails(error);

                    this.toast.error(
                        'Error al eliminar',
                        problem?.detail ?? 'No fue posible eliminar la lista de precios.',
                    );
                },
            });
    }

    loadCatalogs(): void {
        this.catalogsLoadSubject.next();
    }

    private getAllPages<T>(
        getPage: (params: PaginationParams) => Observable<PaginatedResponse<T>>,
    ): Observable<T[]> {
        return getPage({
            page: 1,
            limit: PAGINATION_DEFAULTS.MAX_LIMIT,
        }).pipe(
            switchMap((firstPage) => {
                if (firstPage.meta.totalPages <= 1) {
                    return of(firstPage.data);
                }

                const requests = Array.from({ length: firstPage.meta.totalPages - 1 }, (_, index) =>
                    getPage({
                        page: index + 2,
                        limit: PAGINATION_DEFAULTS.MAX_LIMIT,
                    }),
                );

                return forkJoin(requests).pipe(
                    map((responses) => [
                        ...firstPage.data,
                        ...responses.flatMap((response) => response.data),
                    ]),
                );
            }),
        );
    }

    private setupCatalogsLoader(): void {
        this.catalogsLoadSubject
            .pipe(
                tap(() => {
                    this.loadingCatalogs.set(true);
                    this.catalogsError.set(false);
                    this.catalogsReady.set(false);
                }),
                switchMap(() =>
                    this.getAllPages((params) => this.productsService.getAll(params)).pipe(
                        map((products) => ({
                            products,
                            failed: false as const,
                        })),
                        catchError(() =>
                            of({
                                products: [] as Product[],
                                failed: true as const,
                            }),
                        ),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((result) => {
                this.loadingCatalogs.set(false);

                if (result.failed) {
                    this.catalogsError.set(true);
                    this.catalogsReady.set(false);

                    this.toast.error(
                        'Error al cargar productos',
                        'No fue posible obtener los productos disponibles.',
                    );

                    return;
                }

                this.productItems.set(result.products);
                this.catalogsReady.set(true);
            });
    }

    private formatDate(value: string | null): string {
        if (!value) {
            return 'Sin definir';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return 'Fecha no disponible';
        }

        return new Intl.DateTimeFormat('es-GT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC',
        }).format(date);
    }
}
