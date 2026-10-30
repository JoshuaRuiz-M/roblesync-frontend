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
import { catchError, finalize, forkJoin, map, Observable, of, switchMap, tap, Subject } from 'rxjs';

import { ButtonModule } from 'primeng/button';

import { GoodsReceipt, GoodsReceiptWithDetails } from '../../models/goods-receipt.model';

import { GoodsReceiptsService } from '../../services/goods-receipts.service';

import { GoodsReceiptsForm } from '../../components/goods-receipts-form/goods-receipts-form';

import { GoodsReceiptDetails } from '../../components/goods-receipt-details/goods-receipt-details';

import { PurchaseOrdersService } from '../../../purchase-orders/services/purchase-orders.service';

import {
    PurchaseOrder,
    PurchaseOrderWithDetails,
} from '../../../purchase-orders/models/purchase-order.model';

import { ProductsService } from '../../../../catalog/products/services/products.service';
import { Product } from '../../../../catalog/products/models/product.model';
import { DataGrid } from '../../../../../shared/components/data-grid/components/data-grid/data-grid';
import { FormDialog } from '../../../../../shared/components/form-dialog/form-dialog';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { WarehousesService } from '../../../../inventory/warehouse/services/warehouse.service';
import { Warehouse } from '../../../../inventory/warehouse/models/warehouse.model';
import {
    PAGINATION_DEFAULTS,
    PaginationMeta,
    PaginationParams,
} from '../../../../../core/http/models/pagination.model';
import { DataGridColumn } from '../../../../../shared/components/data-grid/models/data-grid-column.model';
import { DataGridConfig } from '../../../../../shared/components/data-grid/models/data-grid-config.model';
import {
    DataGridAction,
    DataGridActionEvent,
} from '../../../../../shared/components/data-grid/models/data-grid-action.model';
import { DataGridQuery } from '../../../../../shared/components/data-grid/models/data-grid-query.model';
import { PaginatedResponse } from '../../../../../core/http/models/api-response.model';
import { getProblemDetails } from '../../../../../core/http/utils/problem-details.util';

@Component({
    selector: 'app-goods-receipts',
    imports: [DataGrid, FormDialog, ButtonModule, GoodsReceiptsForm, GoodsReceiptDetails],
    templateUrl: './goods-receipts.html',
    styleUrl: './goods-receipts.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoodsReceipts {
    private readonly destroyRef = inject(DestroyRef);
    private readonly authService = inject(AuthService);
    private readonly toastService = inject(ToastService);
    private readonly confirmDialogService = inject(ConfirmDialogService);

    private readonly goodsReceiptsService = inject(GoodsReceiptsService);
    private readonly purchaseOrdersService = inject(PurchaseOrdersService);
    private readonly warehousesService = inject(WarehousesService);
    private readonly productsService = inject(ProductsService);

    readonly receipts = signal<GoodsReceipt[]>([]);
    readonly loading = signal(false);
    readonly error = signal<boolean>(false);

    readonly dialogVisible = signal(false);
    readonly selectedReceipt = signal<GoodsReceiptWithDetails | null>(null);
    readonly saving = signal(false);

    readonly receiptForm = viewChild(GoodsReceiptsForm);

    readonly detailsVisible = signal(false);
    readonly selectedDetailsReceipt = signal<GoodsReceiptWithDetails | null>(null);

    readonly purchaseOrders = signal<PurchaseOrder[]>([]);
    readonly orderItems = signal<PurchaseOrderWithDetails[]>([]);
    readonly warehouseItems = signal<Warehouse[]>([]);
    readonly productItems = signal<Product[]>([]);

    readonly loadingCatalogs = signal(false);
    readonly catalogsError = signal(false);
    readonly catalogsReady = signal(false);

    readonly processingReceiptId = signal<number | null>(null);

    private readonly catalogsLoadSubject = new Subject<void>();

    readonly canCreate = computed(() => this.authService.hasPermission('GOODS_RECEIPT_CREATE'));

    readonly canEdit = computed(() => this.authService.hasPermission('GOODS_RECEIPT_UPDATE'));

    readonly canConfirm = computed(() => this.authService.hasPermission('GOODS_RECEIPT_CONFIRM'));

    readonly canCancel = computed(() => this.authService.hasPermission('GOODS_RECEIPT_CANCEL'));

    readonly dialogTitle = computed(() =>
        this.selectedReceipt() ? 'Editar recepción de mercancías' : 'Nueva recepción de mercancías',
    );

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<GoodsReceipt>[] = [
        {
            field: 'receipt_number',
            header: 'No. recepción',
            width: '180px',
        },
        {
            field: 'purchase_order_id',
            header: 'Orden de compra',
            width: '180px',
            valueGetter: (receipt) => this.getOrderNumber(receipt.purchase_order_id),
        },
        {
            field: 'warehouse_id',
            header: 'Almacén',
            width: '200px',
            valueGetter: (receipt) => this.getWarehouseName(receipt.warehouse_id),
        },
        {
            field: 'receipt_date',
            header: 'Fecha de recepción',
            width: '160px',
            valueGetter: (receipt) => this.formatDate(receipt.receipt_date),
        },
        {
            field: 'status',
            header: 'Estado',
            width: '150px',
            valueGetter: (receipt) => this.getStatusLabel(receipt.status),
        },
        {
            field: 'confirmed_at',
            header: 'Confirmación',
            width: '160px',
            valueGetter: (receipt) =>
                receipt.confirmed_at ? this.formatDate(receipt.confirmed_at) : 'Pendiente',
        },
    ];

    readonly gridConfig = computed<DataGridConfig<GoodsReceipt>>(() => ({
        dataKey: 'goods_receipt_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.canCreate(),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay recepciones de mercancías registradas',
    }));

    readonly actions = computed<DataGridAction<GoodsReceipt>[]>(() => {
        const actions: DataGridAction<GoodsReceipt>[] = [
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
                severity: 'secondary',
                visible: (receipt) => receipt.status === 'DRAFT',
            });
        }

        if (this.canConfirm()) {
            actions.push({
                id: 'confirm',
                label: 'Confirmar',
                icon: 'pi pi-check',
                severity: 'success',
                visible: (receipt) => receipt.status === 'DRAFT',
            });
        }

        if (this.canCancel()) {
            actions.push({
                id: 'cancel',
                label: 'Cancelar',
                icon: 'pi pi-times',
                severity: 'danger',
                visible: (receipt) => receipt.status === 'DRAFT',
            });
        }

        return actions;
    });

    constructor() {
        this.setupCatalogsLoader();
        this.loadReceipts();
        this.loadCatalogs();
    }

    loadReceipts(params?: PaginationParams): void {
        const query = params ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.goodsReceiptsService
            .getAll(query)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.receipts.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);
                    this.toastService.error('Error', 'No se pudieron cargar las recepciones.');
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadReceipts({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadReceipts();
        this.loadCatalogs();
    }

    onAction(event: DataGridActionEvent<GoodsReceipt>): void {
        switch (event.action) {
            case 'view':
                this.onView(event.row);
                break;

            case 'edit':
                this.onEdit(event.row);
                break;

            case 'confirm':
                this.onConfirm(event.row);
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

        this.selectedReceipt.set(null);
        this.dialogVisible.set(true);

        this.loadCatalogs();
    }

    onEdit(receipt: GoodsReceipt): void {
        if (!this.canEdit() || receipt.status !== 'DRAFT') {
            return;
        }

        this.loadReceipt(receipt.goods_receipt_id, 'edit');
    }

    onView(receipt: GoodsReceipt): void {
        this.loadReceipt(receipt.goods_receipt_id, 'view');
    }

    onEditFromDetails(receipt: GoodsReceiptWithDetails): void {
        if (!this.canEdit() || receipt.status !== 'DRAFT') {
            return;
        }

        this.detailsVisible.set(false);
        this.selectedReceipt.set(receipt);
        this.dialogVisible.set(true);
    }

    private loadReceipt(id: number, mode: 'view' | 'edit'): void {
        this.goodsReceiptsService
            .getByIdWithDetails(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (receipt) => {
                    if (mode === 'edit') {
                        if (receipt.status !== 'DRAFT') {
                            this.toastService.error(
                                'Operación no permitida',
                                'Solo se pueden editar recepciones en borrador.',
                            );
                            return;
                        }

                        this.selectedReceipt.set(receipt);
                        this.dialogVisible.set(true);
                        return;
                    }

                    this.selectedDetailsReceipt.set(receipt);
                    this.detailsVisible.set(true);
                },
                error: () => {
                    this.toastService.error('Error', 'No se pudo cargar la recepción.');
                },
            });
    }

    saveReceipt(): void {
        if (this.saving()) {
            return;
        }

        const payload = this.receiptForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedReceipt();

        const request$ = selected
            ? this.goodsReceiptsService.update(selected.goods_receipt_id, {
                  warehouse_id: payload.warehouse_id,
                  notes: payload.notes,
                  details: payload.details,
              })
            : this.goodsReceiptsService.create(payload);

        this.saving.set(true);

        request$
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.saving.set(false)),
            )
            .subscribe({
                next: () => {
                    this.toastService.success(
                        'Operación exitosa',
                        selected
                            ? 'Recepción actualizada correctamente.'
                            : 'Recepción registrada correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedReceipt.set(null);

                    this.loadReceipts();
                },
                error: (error) => {
                    if (this.receiptForm()?.applyValidationErrors(error)) {
                        return;
                    }

                    const problem = getProblemDetails(error);

                    this.toastService.error(
                        'Error al guardar',
                        problem?.detail ?? 'No fue posible guardar la orden de compra.',
                    );
                },
            });
    }

    onConfirm(receipt: GoodsReceipt): void {
        if (
            !this.canConfirm() ||
            receipt.status !== 'DRAFT' ||
            this.processingReceiptId() !== null
        ) {
            return;
        }

        this.confirmDialogService.confirm({
            header: 'Confirmar recepción',
            message:
                `¿Desea confirmar la recepción ${receipt.receipt_number}? ` +
                'Esta operación actualizará las existencias del almacén.',
            icon: 'pi pi-check-circle',
            acceptLabel: 'Confirmar',
            rejectLabel: 'Volver',
            acceptButtonSeverity: 'success',
            accept: () => this.executeConfirm(receipt),
        });
    }

    private executeConfirm(receipt: GoodsReceipt): void {
        this.processingReceiptId.set(receipt.goods_receipt_id);

        this.goodsReceiptsService
            .confirm(receipt.goods_receipt_id)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.processingReceiptId.set(null)),
            )
            .subscribe({
                next: () => {
                    this.toastService.success(
                        'Recepción confirmada',
                        'La mercancía fue ingresada al inventario.',
                    );

                    this.loadReceipts();
                    this.refreshDetails(receipt.goods_receipt_id);
                },
                error: () => {
                    this.toastService.error('Error', 'No se pudo confirmar la recepción.');
                },
            });
    }

    onCancel(receipt: GoodsReceipt): void {
        if (
            !this.canCancel() ||
            receipt.status !== 'DRAFT' ||
            this.processingReceiptId() !== null
        ) {
            return;
        }

        this.confirmDialogService.confirm({
            header: 'Cancelar recepción',
            message:
                `¿Desea cancelar la recepción ${receipt.receipt_number}? ` +
                'Esta acción no se puede deshacer.',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Cancelar recepción',
            rejectLabel: 'Volver',
            acceptButtonSeverity: 'danger',
            accept: () => this.executeCancel(receipt),
        });
    }

    private executeCancel(receipt: GoodsReceipt): void {
        this.processingReceiptId.set(receipt.goods_receipt_id);

        this.goodsReceiptsService
            .cancel(receipt.goods_receipt_id)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.processingReceiptId.set(null)),
            )
            .subscribe({
                next: () => {
                    this.toastService.success(
                        'Recepción cancelada',
                        'La recepción fue cancelada correctamente.',
                    );

                    this.loadReceipts();
                    this.refreshDetails(receipt.goods_receipt_id);
                },
                error: () => {
                    this.toastService.error('Error', 'No se pudo cancelar la recepción.');
                },
            });
    }

    private refreshDetails(id: number): void {
        if (!this.detailsVisible() || this.selectedDetailsReceipt()?.goods_receipt_id !== id) {
            return;
        }

        this.goodsReceiptsService
            .getByIdWithDetails(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (receipt) => this.selectedDetailsReceipt.set(receipt),
            });
    }

    loadCatalogs(): void {
        this.catalogsLoadSubject.next();
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
                        orders: this.getAllPages((params) =>
                            this.purchaseOrdersService.getAll(params),
                        ),
                        warehouses: this.getAllPages((params) =>
                            this.warehousesService.getAll(params),
                        ),
                        products: this.getAllPages((params) => this.productsService.getAll(params)),
                    }).pipe(
                        map((data) => ({
                            success: true as const,
                            data,
                        })),
                        catchError(() =>
                            of({
                                success: false as const,
                                data: null,
                            }),
                        ),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((result) => {
                this.loadingCatalogs.set(false);

                if (!result.success || !result.data) {
                    this.catalogsError.set(true);
                    return;
                }

                this.purchaseOrders.set(result.data.orders);
                this.warehouseItems.set(result.data.warehouses);
                this.productItems.set(result.data.products);

                this.loadOrderDetails(result.data.orders);
            });
    }

    private loadOrderDetails(orders: PurchaseOrder[]): void {
        const eligibleOrders = orders.filter(
            (order) =>
                order.status === 'APPROVED' ||
                order.status === 'PARTIALLY_RECEIVED' ||
                order.purchase_order_id === this.selectedReceipt()?.purchase_order_id,
        );

        if (!eligibleOrders.length) {
            this.orderItems.set([]);
            this.catalogsReady.set(true);
            return;
        }

        forkJoin(
            eligibleOrders.map((order) =>
                this.purchaseOrdersService.getById(order.purchase_order_id),
            ),
        )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (responses) => {
                    this.orderItems.set(responses.map((response) => response.data));

                    this.catalogsReady.set(true);
                },
                error: () => {
                    this.catalogsError.set(true);
                    this.catalogsReady.set(false);
                },
            });
    }

    private getAllPages<T>(
        getPage: (params: PaginationParams) => Observable<PaginatedResponse<T>>,
    ): Observable<T[]> {
        const limit = PAGINATION_DEFAULTS.MAX_LIMIT;

        return getPage({ page: 1, limit }).pipe(
            switchMap((firstResponse) => {
                const totalPages = firstResponse.meta.totalPages;

                if (totalPages <= 1) {
                    return of(firstResponse.data);
                }

                const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
                    getPage({
                        page: index + 2,
                        limit,
                    }),
                );

                return forkJoin(requests).pipe(
                    map((responses) => [
                        ...firstResponse.data,
                        ...responses.flatMap((response) => response.data),
                    ]),
                );
            }),
        );
    }

    getOrderNumber(id: number): string {
        return (
            this.purchaseOrders().find((order) => order.purchase_order_id === id)?.order_number ??
            `Orden #${id}`
        );
    }

    getWarehouseName(id: number): string {
        return (
            this.warehouseItems().find((warehouse) => warehouse.warehouse_id === id)?.name ??
            `Almacén #${id}`
        );
    }

    getStatusLabel(status: GoodsReceipt['status']): string {
        const labels: Record<GoodsReceipt['status'], string> = {
            DRAFT: 'Borrador',
            CONFIRMED: 'Confirmada',
            CANCELLED: 'Cancelada',
        };

        return labels[status];
    }

    formatDate(value: string | null): string {
        if (!value) {
            return 'No definida';
        }

        const [year, month, day] = value.slice(0, 10).split('-');

        return `${day}/${month}/${year}`;
    }
}
