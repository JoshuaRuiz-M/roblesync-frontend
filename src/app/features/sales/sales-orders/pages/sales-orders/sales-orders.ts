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

import { getProblemDetails } from '../../../../../core/http/utils/problem-details.util';

import { DataGrid } from '../../../../../shared/components/data-grid/components/data-grid/data-grid';

import type { DataGridColumn } from '../../../../../shared/components/data-grid/models/data-grid-column.model';
import type { DataGridConfig } from '../../../../../shared/components/data-grid/models/data-grid-config.model';

import type {
    DataGridAction,
    DataGridActionEvent,
} from '../../../../../shared/components/data-grid/models/data-grid-action.model';

import type { DataGridQuery } from '../../../../../shared/components/data-grid/models/data-grid-query.model';

import { FormDialog } from '../../../../../shared/components/form-dialog/form-dialog';

import { SalesOrdersService } from '../../services/sales-orders.service';

import type {
    SalesOrder,
    SalesOrderStatus,
    SalesOrderCreditStatus,
    SalesOrderWithDetails,
} from '../../models/sales-order.model';

import { CustomersService } from '../../../customers/services/customers.service';
import type { Customer } from '../../../customers/models/customer.model';

import { SalespersonsService } from '../../../salespersons/services/salespersons.service';
import type { Saleperson } from '../../../salespersons/models/salesperson.model';

import { ProductsService } from '../../../../catalog/products/services/products.service';
import type { Product } from '../../../../catalog/products/models/product.model';

import { SalesOrdersForm } from '../../components/sales-orders-form/sales-orders-form';
import { SalesOrderDetails } from '../../components/sales-order-details/sales-order-details';
import { WarehousesService } from '../../../../inventory/warehouse/services/warehouse.service';
import { Warehouse } from '../../../../inventory/warehouse/models/warehouse.model';

type OrderOperation =
    | 'submit'
    | 'approve'
    | 'reserve'
    | 'cancel'
    | 'approveCredit'
    | 'rejectCredit';

@Component({
    selector: 'app-sales-orders',
    imports: [DataGrid, FormDialog, ButtonModule, SalesOrdersForm, SalesOrderDetails],
    templateUrl: './sales-orders.html',
    styleUrl: './sales-orders.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesOrders {
    private readonly authService = inject(AuthService);
    private readonly salesOrdersService = inject(SalesOrdersService);
    private readonly customersService = inject(CustomersService);
    private readonly salespersonsService = inject(SalespersonsService);
    private readonly warehousesService = inject(WarehousesService);
    private readonly productsService = inject(ProductsService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly orders = signal<SalesOrder[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedOrder = signal<SalesOrderWithDetails | null>(null);
    readonly saving = signal(false);
    readonly salesOrderForm = viewChild(SalesOrdersForm);

    readonly dialogTitle = computed(() =>
        this.selectedOrder()
            ? `Editar orden ${this.selectedOrder()!.order_number}`
            : 'Nueva orden de venta',
    );

    readonly detailsVisible = signal(false);
    readonly selectedDetailsOrder = signal<SalesOrderWithDetails | null>(null);
    readonly loadingOrder = signal(false);

    readonly customerItems = signal<Customer[]>([]);
    readonly salespersonItems = signal<Saleperson[]>([]);
    readonly warehouseItems = signal<Warehouse[]>([]);
    readonly productItems = signal<Product[]>([]);

    readonly loadingCatalogs = signal(false);
    readonly catalogsError = signal(false);
    readonly catalogsReady = signal(false);

    readonly processingOrderId = signal<number | null>(null);

    private readonly catalogsLoadSubject = new Subject<void>();

    readonly canCreate = computed(() => this.authService.hasPermission('SALES_ORDER_CREATE'));

    readonly canEdit = computed(() => this.authService.hasPermission('SALES_ORDER_UPDATE'));

    readonly canSubmit = computed(() => this.authService.hasPermission('SALES_ORDER_SUBMIT'));

    readonly canApprove = computed(() => this.authService.hasPermission('SALES_ORDER_APPROVE'));

    readonly canReserve = computed(() => this.authService.hasPermission('SALES_ORDER_RESERVE'));

    readonly canCancel = computed(() => this.authService.hasPermission('SALES_ORDER_CANCEL'));

    readonly canApproveCredit = computed(() =>
        this.authService.hasPermission('SALES_ORDER_CREDIT_APPROVE'),
    );

    readonly canRejectCredit = computed(() =>
        this.authService.hasPermission('SALES_ORDER_CREDIT_REJECT'),
    );

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    private readonly statusLabels: Record<SalesOrderStatus, string> = {
        DRAFT: 'Borrador',
        PENDING: 'Pendiente',
        APPROVED: 'Aprobada',
        RESERVED: 'Reservada',
        COMPLETED: 'Completada',
        CANCELLED: 'Cancelada',
    };

    private readonly creditLabels: Record<SalesOrderCreditStatus, string> = {
        PENDING: 'Pendiente',
        APPROVED: 'Autorizado',
        REJECTED: 'Rechazado',
    };

    private readonly currencyFormatter = new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    readonly columns: DataGridColumn<SalesOrder>[] = [
        {
            field: 'order_number',
            header: 'Número de orden',
            width: '160px',
        },
        {
            field: 'customer_id',
            header: 'Cliente',
            width: '240px',
            valueGetter: (row) =>
                this.customerItems().find((customer) => customer.customer_id === row.customer_id)
                    ?.business_name ?? `Cliente #${row.customer_id}`,
        },
        {
            field: 'order_date',
            header: 'Fecha',
            width: '140px',
            valueGetter: (row) => this.formatDate(row.order_date),
        },
        {
            field: 'status',
            header: 'Estado',
            width: '150px',
            valueGetter: (row) => this.statusLabels[row.status],
        },
        {
            field: 'credit_status',
            header: 'Crédito',
            width: '140px',
            valueGetter: (row) => this.creditLabels[row.credit_status],
        },
        {
            field: 'total_amount',
            header: 'Total',
            width: '150px',
            valueGetter: (row) => this.formatCurrency(row.total_amount),
        },
    ];

    readonly gridConfig = computed<DataGridConfig<SalesOrder>>(() => ({
        dataKey: 'sales_order_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.canCreate(),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay órdenes de venta registradas',
    }));

    readonly actions = computed<DataGridAction<SalesOrder>[]>(() => {
        const actions: DataGridAction<SalesOrder>[] = [
            {
                id: 'view',
                label: 'Ver detalles',
                icon: 'pi pi-eye',
                severity: 'secondary',
                tooltip: 'Ver detalles de la orden',
            },
        ];

        if (this.canEdit()) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
                tooltip: 'Editar orden de venta',
            });
        }

        if (this.canSubmit()) {
            actions.push({
                id: 'submit',
                label: 'Enviar',
                icon: 'pi pi-send',
                severity: 'info',
                tooltip: 'Enviar orden de venta',
            });
        }

        if (this.canApprove()) {
            actions.push({
                id: 'approve',
                label: 'Aprobar',
                icon: 'pi pi-check',
                severity: 'success',
                tooltip: 'Aprobar orden de venta',
            });
        }

        if (this.canReserve()) {
            actions.push({
                id: 'reserve',
                label: 'Reservar',
                icon: 'pi pi-box',
                severity: 'success',
                tooltip: 'Reservar productos de la orden',
            });
        }

        if (this.canApproveCredit()) {
            actions.push({
                id: 'approveCredit',
                label: 'Autorizar crédito',
                icon: 'pi pi-credit-card',
                severity: 'success',
                tooltip: 'Autorizar crédito de la orden',
            });
        }

        if (this.canRejectCredit()) {
            actions.push({
                id: 'rejectCredit',
                label: 'Rechazar crédito',
                icon: 'pi pi-ban',
                severity: 'danger',
                tooltip: 'Rechazar crédito de la orden',
            });
        }

        if (this.canCancel()) {
            actions.push({
                id: 'cancel',
                label: 'Cancelar',
                icon: 'pi pi-times',
                severity: 'danger',
                tooltip: 'Cancelar orden de venta',
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

        this.salesOrdersService
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
                        'No fue posible obtener las órdenes de venta.',
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

    onAction(event: DataGridActionEvent<SalesOrder>): void {
        const order = event.row;

        switch (event.action) {
            case 'view':
                this.onView(order);
                break;

            case 'edit':
                this.onEdit(order);
                break;

            case 'submit':
                this.onSubmit(order);
                break;

            case 'approve':
                this.onApprove(order);
                break;

            case 'reserve':
                this.onReserve(order);
                break;

            case 'cancel':
                this.onCancel(order);
                break;

            case 'approveCredit':
                this.onApproveCredit(order);
                break;

            case 'rejectCredit':
                this.onRejectCredit(order);
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

    onEdit(order: SalesOrder): void {
        if (!this.canEdit() || order.status !== 'DRAFT') {
            return;
        }

        this.loadOrder(order.sales_order_id, 'edit');
    }

    onView(order: SalesOrder): void {
        this.loadOrder(order.sales_order_id, 'view');
    }

    onEditFromDetails(order: SalesOrderWithDetails): void {
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

        this.salesOrdersService
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
                        this.toast.warn(
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

        const payload = this.salesOrderForm()?.getPayload();

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
            ? this.salesOrdersService.update(selected.sales_order_id, payload)
            : this.salesOrdersService.create(payload);

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
                            ? 'La orden de venta se actualizó correctamente.'
                            : 'La orden de venta se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedOrder.set(null);
                    this.loadOrders();
                },
                error: (error) => {
                    if (this.salesOrderForm()?.applyValidationErrors(error)) {
                        return;
                    }

                    const problem = getProblemDetails(error);

                    this.toast.error(
                        'Error al guardar',
                        problem?.detail ?? 'No fue posible guardar la orden de venta.',
                    );
                },
            });
    }

    onSubmit(order: SalesOrder): void {
        if (!this.canSubmit()) {
            return;
        }

        if (order.status !== 'DRAFT') {
            this.toast.warn(
                'Operación no permitida',
                'Solo puede enviar órdenes en estado borrador.',
            );
            return;
        }

        this.confirmOperation(
            order,
            'submit',
            'Enviar orden de venta',
            '¿Está seguro de que desea enviar esta orden?',
            'Sí, enviar',
            'info',
        );
    }

    onApprove(order: SalesOrder): void {
        if (!this.canApprove()) {
            return;
        }

        if (order.status !== 'PENDING' || order.credit_status === 'REJECTED') {
            this.toast.warn(
                'Operación no permitida',
                'La orden debe estar pendiente y no tener el crédito rechazado.',
            );
            return;
        }

        this.confirmOperation(
            order,
            'approve',
            'Aprobar orden de venta',
            '¿Está seguro de que desea aprobar esta orden?',
            'Sí, aprobar',
            'success',
        );
    }

    onReserve(order: SalesOrder): void {
        if (!this.canReserve()) {
            return;
        }

        if (order.status !== 'APPROVED' || order.credit_status === 'REJECTED') {
            this.toast.warn(
                'Operación no permitida',
                'La orden debe estar aprobada y no tener el crédito rechazado.',
            );
            return;
        }

        this.confirmOperation(
            order,
            'reserve',
            'Reservar productos',
            '¿Desea reservar los productos de esta orden?',
            'Sí, reservar',
            'success',
        );
    }

    onCancel(order: SalesOrder): void {
        if (!this.canCancel()) {
            return;
        }

        if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
            this.toast.warn('Operación no permitida', 'Esta orden no puede cancelarse.');
            return;
        }

        this.confirmOperation(
            order,
            'cancel',
            'Cancelar orden de venta',
            'Esta acción no se puede deshacer. ¿Desea continuar?',
            'Sí, cancelar orden',
            'danger',
        );
    }

    onApproveCredit(order: SalesOrder): void {
        if (!this.canApproveCredit()) {
            return;
        }

        if (order.status !== 'PENDING' || order.credit_status !== 'PENDING') {
            this.toast.warn(
                'Operación no permitida',
                'La orden debe estar pendiente de autorización crediticia.',
            );
            return;
        }

        this.confirmOperation(
            order,
            'approveCredit',
            'Autorizar crédito',
            '¿Desea autorizar el crédito de esta orden?',
            'Sí, autorizar',
            'success',
        );
    }

    onRejectCredit(order: SalesOrder): void {
        if (!this.canRejectCredit()) {
            return;
        }

        if (order.status !== 'PENDING' || order.credit_status !== 'PENDING') {
            this.toast.warn(
                'Operación no permitida',
                'La orden debe estar pendiente de autorización crediticia.',
            );
            return;
        }

        this.confirmOperation(
            order,
            'rejectCredit',
            'Rechazar crédito',
            '¿Desea rechazar el crédito de esta orden?',
            'Sí, rechazar',
            'danger',
        );
    }

    private confirmOperation(
        order: SalesOrder,
        operation: OrderOperation,
        header: string,
        message: string,
        acceptLabel: string,
        severity: 'success' | 'danger' | 'info',
    ): void {
        if (this.processingOrderId() !== null) {
            return;
        }

        this.confirmDialog.confirm({
            header,
            message: `${message} Orden: ${order.order_number}`,
            icon: severity === 'danger' ? 'pi pi-exclamation-triangle' : 'pi pi-check-circle',
            acceptLabel,
            rejectLabel: 'Volver',
            acceptButtonSeverity: severity,
            accept: () => this.executeOperation(order.sales_order_id, operation),
        });
    }

    private executeOperation(orderId: number, operation: OrderOperation): void {
        if (this.processingOrderId() !== null) {
            return;
        }

        const requests: Record<OrderOperation, () => Observable<unknown>> = {
            submit: () => this.salesOrdersService.submit(orderId),
            approve: () => this.salesOrdersService.approve(orderId),
            reserve: () => this.salesOrdersService.reserve(orderId),
            cancel: () => this.salesOrdersService.cancel(orderId),
            approveCredit: () => this.salesOrdersService.approveCredit(orderId),
            rejectCredit: () => this.salesOrdersService.rejectCredit(orderId),
        };

        const successMessages: Record<OrderOperation, string> = {
            submit: 'La orden de venta se envió correctamente.',
            approve: 'La orden de venta se aprobó correctamente.',
            reserve: 'Los productos se reservaron correctamente.',
            cancel: 'La orden de venta se canceló correctamente.',
            approveCredit: 'El crédito se autorizó correctamente.',
            rejectCredit: 'El crédito se rechazó correctamente.',
        };

        this.processingOrderId.set(orderId);

        requests[operation]()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.processingOrderId.set(null)),
            )
            .subscribe({
                next: () => {
                    this.toast.success('Operación exitosa', successMessages[operation]);

                    this.loadOrders();
                    this.refreshSelectedDetails(orderId);
                },
                error: (error) => {
                    const problem = getProblemDetails(error);

                    this.toast.error(
                        'Error en la operación',
                        problem?.detail ?? 'No fue posible completar la operación.',
                    );
                },
            });
    }

    private refreshSelectedDetails(orderId: number): void {
        if (!this.detailsVisible() || this.selectedDetailsOrder()?.sales_order_id !== orderId) {
            return;
        }

        this.salesOrdersService
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
                        customers: this.getAllPages((params) =>
                            this.customersService.getAll(params),
                        ),
                        salespersons: this.getAllPages((params) =>
                            this.salespersonsService.getAll(params),
                        ),
                        warehouses: this.getAllPages((params) =>
                            this.warehousesService.getAll(params),
                        ),
                        products: this.getAllPages((params) => this.productsService.getAll(params)),
                    }).pipe(
                        map((items) => ({
                            ...items,
                            failed: false as const,
                        })),
                        catchError(() =>
                            of({
                                customers: [] as Customer[],
                                salespersons: [] as Saleperson[],
                                warehouses: [] as Warehouse[],
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
                        'No fue posible obtener clientes, vendedores, almacenes o productos.',
                    );

                    return;
                }

                this.customerItems.set(result.customers);
                this.salespersonItems.set(result.salespersons);
                this.warehouseItems.set(result.warehouses);
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
