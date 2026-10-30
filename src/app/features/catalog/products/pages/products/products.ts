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
import type { PaginatedResponse } from '../../../../../core/http/models/api-response.model';

import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';

import { DataGrid } from '../../../../../shared/components/data-grid/components/data-grid/data-grid';
import { FormDialog } from '../../../../../shared/components/form-dialog/form-dialog';

import { ProductsService } from '../../services/products.service';
import type {
    Product,
    CreateProduct,
    UpdateProduct,
    ProductSupplierDetail,
} from '../../models/product.model';

import { BrandsService } from '../../../brands/services/brands.service';
import type { Brand } from '../../../brands/models/brand.model';

import { ProductLinesService } from '../../../product-lines/services/product-lines.service';
import type { ProductLine } from '../../../product-lines/models/product-line.model';

import { ProductsForm } from '../../components/products-form/products-form';

import { ButtonModule } from 'primeng/button';
import { UnitsOfMeasureService } from '../../../units-of-mesure/services/units-of-mesure.service';
import { UnitOfMeasure } from '../../../units-of-mesure/models/unit-of-mesure.model';
import { ProductDetails } from '../../components/product-details/product-details';
import {
    ProductSupplierForm,
    ProductSupplierFormSave,
} from '../../components/product-supplier-form/product-supplier-form';
import { Supplier } from '../../../../purchasing/suppliers/models/supplier.model';
import { SuppliersService } from '../../../../purchasing/suppliers/services/suppliers.service';

@Component({
    selector: 'app-products',
    imports: [
        DataGrid,
        FormDialog,
        ProductsForm,
        ButtonModule,
        ProductDetails,
        ProductSupplierForm,
    ],
    templateUrl: './products.html',
    styleUrl: './products.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Products {
    private readonly authService = inject(AuthService);

    private readonly productsService = inject(ProductsService);
    private readonly brandsService = inject(BrandsService);
    private readonly productLinesService = inject(ProductLinesService);
    private readonly unitsService = inject(UnitsOfMeasureService);

    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly products = signal<Product[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedProduct = signal<Product | null>(null);
    readonly saving = signal(false);

    readonly productForm = viewChild(ProductsForm);

    readonly dialogTitle = computed(() =>
        this.selectedProduct() ? 'Editar producto' : 'Nuevo producto',
    );

    readonly brandItems = signal<Brand[]>([]);
    readonly productLineItems = signal<ProductLine[]>([]);
    readonly unitItems = signal<UnitOfMeasure[]>([]);

    readonly loadingCatalogs = signal(false);
    readonly catalogsError = signal(false);
    readonly catalogsReady = signal(false);

    private readonly catalogsLoadSubject = new Subject<void>();

    readonly detailsVisible = signal(false);
    readonly selectedDetailsProduct = signal<Product | null>(null);

    private readonly suppliersService = inject(SuppliersService);

    readonly supplierDialogVisible = signal(false);
    readonly supplierSaving = signal(false);

    readonly supplierProduct = signal<Product | null>(null);
    readonly selectedSupplierAssociation = signal<ProductSupplierDetail | null>(null);

    readonly supplierItems = signal<Supplier[]>([]);
    readonly loadingSuppliers = signal(false);
    readonly suppliersError = signal(false);
    readonly suppliersRefreshKey = signal(0);
    readonly associatedSupplierIds = signal<number[]>([]);

    readonly canReadSuppliers = computed(() =>
        this.authService.hasPermission('PRODUCT_SUPPLIER_READ'),
    );

    readonly canManageSuppliers = computed(() =>
        this.authService.hasPermission('PRODUCT_SUPPLIER_MANAGE'),
    );

    readonly canEditProduct = computed(() => this.authService.hasPermission('PRODUCT_UPDATE'));

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<Product>[] = [
        {
            field: 'sku',
            header: 'SKU',
            width: '150px',
        },
        {
            field: 'name',
            header: 'Producto',
            width: '250px',
        },
        {
            field: 'barcode',
            header: 'Código de barras',
            width: '180px',
        },
        {
            field: 'brand_id',
            header: 'Marca',
            width: '180px',
            valueGetter: (row) =>
                this.brandItems().find((item) => item.brand_id === row.brand_id)?.name ??
                `#${row.brand_id}`,
        },
        {
            field: 'product_line_id',
            header: 'Línea de producto',
            width: '200px',
            valueGetter: (row) =>
                this.productLineItems().find((item) => item.product_line_id === row.product_line_id)
                    ?.name ?? `#${row.product_line_id}`,
        },
        {
            field: 'unit_of_measure_id',
            header: 'Unidad',
            width: '130px',
            valueGetter: (row) =>
                this.unitItems().find((item) => item.unit_of_measure_id === row.unit_of_measure_id)
                    ?.abbreviation ?? `#${row.unit_of_measure_id}`,
        },
        {
            field: 'average_cost',
            header: 'Costo promedio',
            width: '150px',
            valueGetter: (row) => this.formatCurrency(row.average_cost),
        },
        {
            field: 'list_price',
            header: 'Precio de venta',
            width: '150px',
            valueGetter: (row) => this.formatCurrency(row.list_price),
        },
        {
            field: 'is_active',
            header: 'Estado',
            type: 'boolean',
            width: '110px',
        },
    ];

    readonly gridConfig = computed<DataGridConfig<Product>>(() => ({
        dataKey: 'product_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('PRODUCT_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay productos registrados',
    }));

    readonly actions = computed<DataGridAction<Product>[]>(() => {
        const actions: DataGridAction<Product>[] = [
            {
                id: 'view',
                label: 'Ver detalles',
                icon: 'pi pi-eye',
                severity: 'secondary',
            },
        ];

        if (this.authService.hasPermission('PRODUCT_UPDATE')) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });
        }

        if (this.authService.hasPermission('PRODUCT_DELETE')) {
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

        this.loadProducts();
        this.loadCatalogs();
    }

    loadProducts(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.productsService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.products.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);
                    this.products.set([]);

                    this.toast.error('Error al cargar', 'No fue posible obtener los productos.');
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadProducts({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadProducts();
        this.loadCatalogs();
    }

    onAction(event: DataGridActionEvent<Product>): void {
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

    onView(product: Product): void {
        this.selectedDetailsProduct.set(product);
        this.detailsVisible.set(true);
    }

    onEditFromDetails(product: Product): void {
        this.detailsVisible.set(false);
        this.onEdit(product);
    }

    onCreate(): void {
        this.selectedProduct.set(null);
        this.dialogVisible.set(true);

        this.productForm()?.resetForm(null);

        if (!this.catalogsReady() && !this.loadingCatalogs()) {
            this.loadCatalogs();
        }
    }

    private onEdit(product: Product): void {
        this.selectedProduct.set(product);
        this.dialogVisible.set(true);

        this.productForm()?.resetForm(product);

        if (!this.catalogsReady() && !this.loadingCatalogs()) {
            this.loadCatalogs();
        }
    }

    private onDelete(product: Product): void {
        this.confirmDialog.delete(
            `¿Está seguro de que desea eliminar el producto "${product.name}"?`,
            () => this.deleteProduct(product.product_id),
        );
    }

    private deleteProduct(productId: number): void {
        this.productsService
            .delete(productId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Producto eliminado',
                        'El producto se eliminó correctamente.',
                    );

                    // Evita quedar en una página vacía
                    // después de eliminar su último registro.
                    if (this.products().length === 1 && this.pagination().page > 1) {
                        this.pagination.update((meta) => ({
                            ...meta,
                            page: meta.page - 1,
                        }));
                    }

                    this.loadProducts();
                },
                error: () => {
                    this.toast.error('Error al eliminar', 'No fue posible eliminar el producto.');
                },
            });
    }

    saveProduct(): void {
        if (this.saving() || !this.catalogsReady()) {
            return;
        }

        const payload = this.productForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedProduct();

        this.saving.set(true);

        const request$ = selected
            ? this.productsService.update(selected.product_id, payload as UpdateProduct)
            : this.productsService.create(payload as CreateProduct);

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
                            ? 'El producto se actualizó correctamente.'
                            : 'El producto se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedProduct.set(null);

                    this.loadProducts();
                },
                error: (error) => {
                    const applied = this.productForm()?.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error('Error al guardar', 'No fue posible guardar el producto.');
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
                const totalPages = firstPage.meta.totalPages;

                if (totalPages <= 1) {
                    return of(firstPage.data);
                }

                const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
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
                    forkJoin({
                        brands: this.getAllPages((params) => this.brandsService.getAll(params)),
                        lines: this.getAllPages((params) =>
                            this.productLinesService.getAll(params),
                        ),
                        units: this.getAllPages((params) => this.unitsService.getAll(params)),
                    }).pipe(
                        map((items) => ({
                            ...items,
                            failed: false as const,
                        })),
                        catchError(() =>
                            of({
                                brands: [] as Brand[],
                                lines: [] as ProductLine[],
                                units: [] as UnitOfMeasure[],
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
                        'Error al cargar catálogos',
                        'No fue posible obtener las marcas, líneas de producto o unidades de medida.',
                    );

                    return;
                }

                this.brandItems.set(result.brands);
                this.productLineItems.set(result.lines);
                this.unitItems.set(result.units);

                this.catalogsReady.set(true);
            });
    }

    onAssociateSupplier(product: Product): void {
        if (!this.canManageSuppliers()) {
            return;
        }

        this.detailsVisible.set(false);
        this.supplierProduct.set(product);
        this.selectedSupplierAssociation.set(null);

        this.associatedSupplierIds.set([]);
        this.supplierDialogVisible.set(true);

        this.loadSuppliers();

        this.productsService
            .getSuppliers(product.product_id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    this.associatedSupplierIds.set(response.data.map((item) => item.supplier_id));
                },
                error: () => {
                    this.toast.error(
                        'Error al consultar asociaciones',
                        'No fue posible comprobar los proveedores asociados.',
                    );
                },
            });
    }

    onEditSupplier(event: { product: Product; supplier: ProductSupplierDetail }): void {
        if (!this.canManageSuppliers()) {
            return;
        }

        this.detailsVisible.set(false);

        this.supplierProduct.set(event.product);
        this.selectedSupplierAssociation.set(event.supplier);

        this.supplierDialogVisible.set(true);
    }

    loadSuppliers(): void {
        this.loadingSuppliers.set(true);
        this.suppliersError.set(false);

        this.getAllPages((params) => this.suppliersService.getAll(params))
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loadingSuppliers.set(false)),
            )
            .subscribe({
                next: (suppliers) => {
                    this.supplierItems.set(suppliers);
                },
                error: () => {
                    this.suppliersError.set(true);

                    this.toast.error(
                        'Error al cargar proveedores',
                        'No fue posible obtener el catálogo de proveedores.',
                    );
                },
            });
    }

    saveSupplierAssociation(event: ProductSupplierFormSave): void {
        const product = this.supplierProduct();

        if (!product || this.supplierSaving() || !this.canManageSuppliers()) {
            return;
        }

        this.supplierSaving.set(true);

        const request$ =
            event.mode === 'create'
                ? this.productsService.addSupplier(product.product_id, event.payload)
                : this.productsService.updateSupplier(
                      product.product_id,
                      event.supplierId,
                      event.payload,
                  );

        request$
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.supplierSaving.set(false)),
            )
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Operación exitosa',
                        event.mode === 'create'
                            ? 'El proveedor se asoció correctamente.'
                            : 'La asociación se actualizó correctamente.',
                    );

                    this.supplierDialogVisible.set(false);
                    this.selectedSupplierAssociation.set(null);
                    this.supplierProduct.set(null);
                },
                error: () => {
                    this.toast.error(
                        'Error al guardar',
                        'No fue posible guardar la asociación del proveedor.',
                    );
                },
            });
    }

    onPreferredSupplier(event: { product: Product; supplier: ProductSupplierDetail }): void {
        if (!this.canManageSuppliers()) {
            return;
        }

        this.productsService
            .setPreferredSupplier(event.product.product_id, event.supplier.supplier_id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Proveedor preferido',
                        'El proveedor preferido se actualizó correctamente.',
                    );

                    this.suppliersRefreshKey.update((value) => value + 1);
                },
                error: () => {
                    this.toast.error(
                        'Error al actualizar',
                        'No fue posible establecer el proveedor preferido.',
                    );
                },
            });
    }

    onRemoveSupplier(event: { product: Product; supplier: ProductSupplierDetail }): void {
        if (!this.canManageSuppliers()) {
            return;
        }

        this.confirmDialog.delete(
            `¿Está seguro de que desea desasociar al proveedor "${event.supplier.business_name}" del producto "${event.product.name}"?`,
            () => this.removeSupplierAssociation(event),
        );
    }

    private removeSupplierAssociation(event: {
        product: Product;
        supplier: ProductSupplierDetail;
    }): void {
        this.productsService
            .removeSupplier(event.product.product_id, event.supplier.supplier_id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Proveedor desasociado',
                        'El proveedor se desasoció correctamente.',
                    );

                    this.suppliersRefreshKey.update((value) => value + 1);
                },
                error: () => {
                    this.toast.error(
                        'Error al desasociar',
                        'No fue posible desasociar al proveedor.',
                    );
                },
            });
    }

    private readonly currencyFormatter = new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    private formatCurrency(value: number): string {
        return this.currencyFormatter.format(Number(value));
    }
}
