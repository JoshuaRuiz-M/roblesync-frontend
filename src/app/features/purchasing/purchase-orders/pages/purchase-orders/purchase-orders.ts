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

import { PurchaseOrdersService } from '../../services/purchase-orders.service';

import type {
    CreatePurchaseOrder,
    PurchaseOrder,
    PurchaseOrderStatus,
    PurchaseOrderWithDetails,
    UpdatePurchaseOrder,
} from '../../models/purchase-order.model';

import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import type { Supplier } from '../../../suppliers/models/supplier.model';

import { ProductsService } from '../../../../catalog/products/services/products.service';
import type { Product } from '../../../../catalog/products/models/product.model';

import { PurchaseOrdersForm } from '../../components/purchase-orders-form/purchase-orders-form';
import { PurchaseOrderDetails } from '../../components/purchase-order-details/purchase-order-details';
import { getProblemDetails } from '../../../../../core/http/utils/problem-details.util';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';

@Component({
    selector: 'app-purchase-orders',
    imports: [DataGrid, FormDialog, ButtonModule, PurchaseOrdersForm, PurchaseOrderDetails],
    templateUrl: './purchase-orders.html',
    styleUrl: './purchase-orders.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrders {
    private readonly authService = inject(AuthService);
    private readonly purchaseOrdersService = inject(PurchaseOrdersService);
    private readonly suppliersService = inject(SuppliersService);
    private readonly productsService = inject(ProductsService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly orders = signal<PurchaseOrder[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedOrder = signal<PurchaseOrderWithDetails | null>(null);
    readonly saving = signal(false);
    readonly purchaseOrderForm = viewChild(PurchaseOrdersForm);

    readonly dialogTitle = computed(() =>
        this.selectedOrder()
            ? `Editar orden ${this.selectedOrder()!.order_number}`
            : 'Nueva orden de compra',
    );

    readonly detailsVisible = signal(false);
    readonly selectedDetailsOrder = signal<PurchaseOrderWithDetails | null>(null);
    readonly loadingOrder = signal(false);

    readonly supplierItems = signal<Supplier[]>([]);
    readonly productItems = signal<Product[]>([]);
    readonly loadingCatalogs = signal(false);
    readonly catalogsError = signal(false);
    readonly catalogsReady = signal(false);

    readonly processingOrderId = signal<number | null>(null);

    private readonly catalogsLoadSubject = new Subject<void>();

    readonly canCreate = computed(() => this.authService.hasPermission('PURCHASE_ORDER_CREATE'));

    readonly canEdit = computed(() => this.authService.hasPermission('PURCHASE_ORDER_UPDATE'));

    readonly canApprove = computed(() => this.authService.hasPermission('PURCHASE_ORDER_APPROVE'));

    readonly canCancel = computed(() => this.authService.hasPermission('PURCHASE_ORDER_CANCEL'));

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    private readonly statusLabels: Record<PurchaseOrderStatus, string> = {
        DRAFT: 'Borrador',
        APPROVED: 'Aprobada',
        PARTIALLY_RECEIVED: 'Recibida parcialmente',
        RECEIVED: 'Recibida',
        CANCELLED: 'Cancelada',
    };

    private readonly currencyFormatter = new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    readonly columns: DataGridColumn<PurchaseOrder>[] = [
        {
            field: 'order_number',
            header: 'Número de orden',
            width: '170px',
        },
        {
            field: 'supplier_id',
            header: 'Proveedor',
            width: '240px',
            valueGetter: (row) =>
                this.supplierItems().find((supplier) => supplier.supplier_id === row.supplier_id)
                    ?.business_name ?? `Proveedor #${row.supplier_id}`,
        },
        {
            field: 'order_date',
            header: 'Fecha de orden',
            width: '150px',
            valueGetter: (row) => this.formatDate(row.order_date),
        },
        {
            field: 'expected_date',
            header: 'Fecha esperada',
            width: '150px',
            valueGetter: (row) => this.formatDate(row.expected_date),
        },
        {
            field: 'status',
            header: 'Estado',
            width: '180px',
            valueGetter: (row) => this.statusLabels[row.status],
        },
        {
            field: 'total_amount',
            header: 'Total',
            width: '160px',
            valueGetter: (row) => this.formatCurrency(row.total_amount),
        },
    ];

    readonly gridConfig = computed<DataGridConfig<PurchaseOrder>>(() => ({
        dataKey: 'purchase_order_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.canCreate(),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay órdenes de compra registradas',
    }));

    readonly actions = computed<DataGridAction<PurchaseOrder>[]>(() => {
        const actions: DataGridAction<PurchaseOrder>[] = [
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

        if (this.canApprove()) {
            actions.push({
                id: 'approve',
                label: 'Aprobar',
                icon: 'pi pi-check',
                severity: 'success',
            });
        }

        if (this.canCancel()) {
            actions.push({
                id: 'cancel',
                label: 'Cancelar',
                icon: 'pi pi-times',
                severity: 'danger',
            });
        }

        return actions;
    });

    constructor() {
        this.setupCatalogsLoader();
        this.loadOrders();
        this.loadCatalogs();
    }

    loadOrders(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.purchaseOrdersService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.orders.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);
                    this.orders.set([]);

                    this.toast.error(
                        'Error al cargar',
                        'No fue posible obtener las órdenes de compra.',
                    );
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadOrders({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadOrders();
        this.loadCatalogs();
    }

    onAction(event: DataGridActionEvent<PurchaseOrder>): void {
        switch (event.action) {
            case 'view':
                this.onView(event.row);
                break;

            case 'edit':
                this.onEdit(event.row);
                break;

            case 'approve':
                this.onApprove(event.row);
                break;

            case 'cancel':
                this.onCancel(event.row);
                break;
        }
    }

    onCreate(): void {
        if (!this.canCreate()) {
            return;
        }

        this.selectedOrder.set(null);
        this.dialogVisible.set(true);

        if (!this.catalogsReady() && !this.loadingCatalogs()) {
            this.loadCatalogs();
        }
    }

    onEdit(order: PurchaseOrder): void {
        if (!this.canEdit() || order.status !== 'DRAFT') {
            return;
        }

        this.loadOrder(order.purchase_order_id, 'edit');
    }

    onView(order: PurchaseOrder): void {
        this.loadOrder(order.purchase_order_id, 'view');
    }

    onEditFromDetails(order: PurchaseOrderWithDetails): void {
        if (!this.canEdit() || order.status !== 'DRAFT') {
            return;
        }

        this.detailsVisible.set(false);
        this.selectedDetailsOrder.set(null);
        this.selectedOrder.set(order);
        this.dialogVisible.set(true);

        if (!this.catalogsReady() && !this.loadingCatalogs()) {
            this.loadCatalogs();
        }
    }

    private loadOrder(orderId: number, mode: 'view' | 'edit'): void {
        if (this.loadingOrder()) {
            return;
        }

        this.loadingOrder.set(true);

        this.purchaseOrdersService
            .getById(orderId)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loadingOrder.set(false)),
            )
            .subscribe({
                next: (response) => {
                    const order = response.data;

                    if (mode === 'view') {
                        this.selectedDetailsOrder.set(order);
                        this.detailsVisible.set(true);
                        return;
                    }

                    if (order.status !== 'DRAFT') {
                        this.toast.error(
                            'Orden no editable',
                            'Solo puede editar órdenes en estado borrador.',
                        );

                        this.loadOrders();
                        return;
                    }

                    this.selectedOrder.set(order);
                    this.dialogVisible.set(true);

                    if (!this.catalogsReady() && !this.loadingCatalogs()) {
                        this.loadCatalogs();
                    }
                },
                error: () => {
                    this.toast.error(
                        'Error al cargar',
                        'No fue posible obtener los detalles de la orden.',
                    );
                },
            });
    }

    saveOrder(): void {
        if (this.saving() || !this.catalogsReady()) {
            return;
        }

        const payload = this.purchaseOrderForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedOrder();

        if (selected && (!this.canEdit() || selected.status !== 'DRAFT')) {
            return;
        }

        if (!selected && !this.canCreate()) {
            return;
        }

        this.saving.set(true);

        const request$ = selected
            ? this.purchaseOrdersService.update(
                  selected.purchase_order_id,
                  payload as UpdatePurchaseOrder,
              )
            : this.purchaseOrdersService.create(payload as CreatePurchaseOrder);

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
                            ? 'La orden de compra se actualizó correctamente.'
                            : 'La orden de compra se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedOrder.set(null);
                    this.loadOrders();
                },
                error: (error) => {
                    if (this.purchaseOrderForm()?.applyValidationErrors(error)) {
                        return;
                    }

                    const problem = getProblemDetails(error);

                    this.toast.error(
                        'Error al guardar',
                        problem?.detail ?? 'No fue posible guardar la orden de compra.',
                    );
                },
            });
    }

    onApprove(order: PurchaseOrder): void {
        if (!this.canApprove()) {
            return;
        }

        if (this.processingOrderId() !== null) {
            return;
        }

        if (order.status !== 'DRAFT') {
            this.toast.warn(
                'Operación no permitida',
                'Solo se pueden aprobar órdenes en estado borrador.',
            );
            return;
        }

        this.confirmDialog.confirm({
            header: 'Aprobar orden de compra',
            message: `¿Está seguro de que desea aprobar la orden ${order.order_number}?`,
            icon: 'pi pi-check-circle',
            acceptLabel: 'Sí, aprobar',
            rejectLabel: 'Cancelar',
            acceptButtonSeverity: 'success',
            accept: () => this.approveOrder(order.purchase_order_id),
        });
    }

    private approveOrder(orderId: number): void {
        if (this.processingOrderId() !== null) {
            return;
        }

        this.processingOrderId.set(orderId);

        this.purchaseOrdersService
            .approve(orderId)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.processingOrderId.set(null)),
            )
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Orden aprobada',
                        'La orden de compra se aprobó correctamente.',
                    );

                    this.loadOrders();
                    this.refreshSelectedDetails(orderId);
                },
                error: () => {
                    this.toast.error(
                        'Error al aprobar',
                        'No fue posible aprobar la orden de compra.',
                    );
                },
            });
    }

    onCancel(order: PurchaseOrder): void {
        if (!this.canCancel()) {
            return;
        }

        if (this.processingOrderId() !== null) {
            return;
        }

        if (order.status !== 'DRAFT' && order.status !== 'APPROVED') {
            this.toast.warn(
                'Operación no permitida',
                'Solo se pueden cancelar órdenes en estado borrador o aprobado.',
            );
            return;
        }

        this.confirmDialog.confirm({
            header: 'Cancelar orden de compra',
            message: `¿Está seguro de que desea cancelar la orden ${order.order_number}? Esta acción no se puede deshacer.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, cancelar orden',
            rejectLabel: 'Volver',
            acceptButtonSeverity: 'danger',
            accept: () => this.cancelOrder(order.purchase_order_id),
        });
    }

    private cancelOrder(orderId: number): void {
        if (this.processingOrderId() !== null) {
            return;
        }

        this.processingOrderId.set(orderId);

        this.purchaseOrdersService
            .cancel(orderId)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.processingOrderId.set(null)),
            )
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Orden cancelada',
                        'La orden de compra se canceló correctamente.',
                    );

                    this.loadOrders();
                    this.refreshSelectedDetails(orderId);
                },
                error: () => {
                    this.toast.error(
                        'Error al cancelar',
                        'No fue posible cancelar la orden de compra.',
                    );
                },
            });
    }

    private refreshSelectedDetails(orderId: number): void {
        if (!this.detailsVisible() || this.selectedDetailsOrder()?.purchase_order_id !== orderId) {
            return;
        }

        this.purchaseOrdersService
            .getById(orderId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    this.selectedDetailsOrder.set(response.data);
                },
                error: () => {
                    this.toast.error(
                        'Error al actualizar',
                        'No fue posible actualizar los detalles de la orden.',
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
                    forkJoin({
                        suppliers: this.getAllPages((params) =>
                            this.suppliersService.getAll(params),
                        ),
                        products: this.getAllPages((params) => this.productsService.getAll(params)),
                    }).pipe(
                        map((items) => ({
                            ...items,
                            failed: false as const,
                        })),
                        catchError(() =>
                            of({
                                suppliers: [] as Supplier[],
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
                        'Error al cargar catálogos',
                        'No fue posible obtener proveedores o productos.',
                    );

                    return;
                }

                this.supplierItems.set(result.suppliers);
                this.productItems.set(result.products);
                this.catalogsReady.set(true);
            });
    }

    private formatDate(value: string | null): string {
        if (!value) {
            return 'Sin definir';
        }

        const [year, month, day] = value.slice(0, 10).split('-');

        return `${day}/${month}/${year}`;
    }

    private formatCurrency(value: number): string {
        return this.currencyFormatter.format(Number(value));
    }
}
