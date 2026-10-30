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

import { WarehouseTransfersService } from '../../services/warehouse-transfers.service';

import type {
    WarehouseTransfer,
    WarehouseTransferStatus,
    WarehouseTransferWithDetails,
} from '../../models/warehouse-transfer.model';

import {
    WarehouseTransfersForm,
    type TransferCatalogItem,
    type TransferBatchItem,
} from '../../components/warehouse-transfers-form/warehouse-transfers-form';

import { WarehouseTransferDetails } from '../../components/warehouse-transfer-details/warehouse-transfer-details';

import { WarehousesService } from '../../../../inventory/warehouse/services/warehouse.service';
import type { Warehouse } from '../../../../inventory/warehouse/models/warehouse.model';

import { ProductsService } from '../../../../catalog/products/services/products.service';
import type { Product } from '../../../../catalog/products/models/product.model';

import { ProductBatchesService } from '../../../../inventory/product-batches/services/product-batches.service';
import type { ProductBatch } from '../../../../inventory/product-batches/models/product-batche.model';

type TransferOperation = 'dispatch' | 'receive' | 'cancel';

@Component({
    selector: 'app-warehouse-transfers',
    imports: [DataGrid, FormDialog, ButtonModule, WarehouseTransfersForm, WarehouseTransferDetails],
    templateUrl: './warehouse-transfers.html',
    styleUrl: './warehouse-transfers.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseTransfers {
    private readonly authService = inject(AuthService);
    private readonly transfersService = inject(WarehouseTransfersService);
    private readonly warehousesService = inject(WarehousesService);
    private readonly productsService = inject(ProductsService);
    private readonly productBatchesService = inject(ProductBatchesService);

    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly transfers = signal<WarehouseTransfer[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedTransfer = signal<WarehouseTransferWithDetails | null>(null);
    readonly saving = signal(false);

    readonly transferForm = viewChild(WarehouseTransfersForm);

    readonly dialogTitle = computed(() => {
        const transfer = this.selectedTransfer();

        return transfer
            ? `Editar transferencia ${transfer.transfer_number}`
            : 'Nueva transferencia entre bodegas';
    });

    readonly detailsVisible = signal(false);
    readonly selectedDetailsTransfer = signal<WarehouseTransferWithDetails | null>(null);
    readonly loadingTransfer = signal(false);

    readonly warehouses = signal<Warehouse[]>([]);
    readonly products = signal<Product[]>([]);
    readonly batches = signal<ProductBatch[]>([]);

    readonly warehouseItems = computed<TransferCatalogItem[]>(() =>
        this.warehouses()
            .filter((warehouse) => warehouse.is_active)
            .map((warehouse) => ({
                label: `${warehouse.code} - ${warehouse.name}`,
                value: warehouse.warehouse_id,
            })),
    );

    readonly productItems = computed<TransferCatalogItem[]>(() =>
        this.products()
            .filter((product) => product.is_active)
            .map((product) => ({
                label: `${product.sku} - ${product.name}`,
                value: product.product_id,
            })),
    );

    readonly batchItems = computed<TransferBatchItem[]>(() =>
        this.batches().map((batch) => ({
            label: batch.batch_number,
            value: batch.batch_id,
            product_id: batch.product_id,
            is_active: batch.is_active,
        })),
    );

    readonly loadingCatalogs = signal(false);
    readonly catalogsError = signal(false);
    readonly catalogsReady = signal(false);

    readonly processingTransferId = signal<number | null>(null);

    private readonly catalogsLoadSubject = new Subject<void>();

    readonly canCreate = computed(() =>
        this.authService.hasPermission('WAREHOUSE_TRANSFERS_CREATE'),
    );

    readonly canEdit = computed(() => this.authService.hasPermission('WAREHOUSE_TRANSFERS_UPDATE'));

    readonly canDispatch = computed(() =>
        this.authService.hasPermission('WAREHOUSE_TRANSFERS_DISPATCH'),
    );

    readonly canReceive = computed(() =>
        this.authService.hasPermission('WAREHOUSE_TRANSFERS_RECEIVE'),
    );

    readonly canCancel = computed(() =>
        this.authService.hasPermission('WAREHOUSE_TRANSFERS_CANCEL'),
    );

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    private readonly statusLabels: Record<WarehouseTransferStatus, string> = {
        DRAFT: 'Borrador',
        IN_TRANSIT: 'En tránsito',
        RECEIVED: 'Recibida',
        CANCELLED: 'Cancelada',
    };

    readonly columns: DataGridColumn<WarehouseTransfer>[] = [
        {
            field: 'transfer_number',
            header: 'Número de transferencia',
            width: '190px',
        },
        {
            field: 'source_warehouse_id',
            header: 'Bodega de origen',
            width: '220px',
            valueGetter: (row) => this.getWarehouseName(row.source_warehouse_id),
        },
        {
            field: 'destination_warehouse_id',
            header: 'Bodega de destino',
            width: '220px',
            valueGetter: (row) => this.getWarehouseName(row.destination_warehouse_id),
        },
        {
            field: 'transfer_date',
            header: 'Fecha',
            width: '140px',
            valueGetter: (row) => this.formatDate(row.transfer_date),
        },
        {
            field: 'status',
            header: 'Estado',
            width: '140px',
            valueGetter: (row) => this.statusLabels[row.status],
        },
    ];

    readonly gridConfig = computed<DataGridConfig<WarehouseTransfer>>(() => ({
        dataKey: 'warehouse_transfer_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.canCreate(),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay transferencias entre bodegas registradas',
    }));

    readonly actions = computed<DataGridAction<WarehouseTransfer>[]>(() => {
        const actions: DataGridAction<WarehouseTransfer>[] = [
            {
                id: 'view',
                label: 'Ver detalles',
                icon: 'pi pi-eye',
                severity: 'secondary',
                tooltip: 'Ver detalles de la transferencia',
            },
        ];

        if (this.canEdit()) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
                tooltip: 'Editar transferencia en borrador',
            });
        }

        if (this.canDispatch()) {
            actions.push({
                id: 'dispatch',
                label: 'Despachar',
                icon: 'pi pi-send',
                severity: 'info',
                tooltip: 'Despachar transferencia',
            });
        }

        if (this.canReceive()) {
            actions.push({
                id: 'receive',
                label: 'Recibir',
                icon: 'pi pi-check',
                severity: 'success',
                tooltip: 'Recibir transferencia',
            });
        }

        if (this.canCancel()) {
            actions.push({
                id: 'cancel',
                label: 'Cancelar',
                icon: 'pi pi-times',
                severity: 'danger',
                tooltip: 'Cancelar transferencia en borrador',
            });
        }

        return actions;
    });

    constructor() {
        this.setupCatalogsLoader();
        this.loadTransfers();
        this.loadCatalogs();
    }

    loadTransfers(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.transfersService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.transfers.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);
                    this.transfers.set([]);

                    this.toast.error(
                        'Error al cargar',
                        'No fue posible obtener las transferencias entre bodegas.',
                    );
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadTransfers({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadTransfers();
        this.loadCatalogs();
    }

    onAction(event: DataGridActionEvent<WarehouseTransfer>): void {
        const transfer = event.row;

        switch (event.action) {
            case 'view':
                this.onView(transfer);
                break;

            case 'edit':
                this.onEdit(transfer);
                break;

            case 'dispatch':
                this.onDispatch(transfer);
                break;

            case 'receive':
                this.onReceive(transfer);
                break;

            case 'cancel':
                this.onCancel(transfer);
                break;
        }
    }

    onCreate(): void {
        if (!this.canCreate()) {
            return;
        }

        this.selectedTransfer.set(null);
        this.dialogVisible.set(true);

        if (!this.catalogsReady() && !this.loadingCatalogs()) {
            this.loadCatalogs();
        }
    }

    onEdit(transfer: WarehouseTransfer): void {
        if (!this.canEdit() || transfer.status !== 'DRAFT') {
            return;
        }

        this.loadTransfer(transfer.warehouse_transfer_id, 'edit');
    }

    onView(transfer: WarehouseTransfer): void {
        this.loadTransfer(transfer.warehouse_transfer_id, 'view');
    }

    onEditFromDetails(transferId: number): void {
        const transfer = this.selectedDetailsTransfer();

        if (
            !transfer ||
            transfer.warehouse_transfer_id !== transferId ||
            !this.canEdit() ||
            transfer.status !== 'DRAFT'
        ) {
            return;
        }

        this.detailsVisible.set(false);
        this.selectedDetailsTransfer.set(null);
        this.selectedTransfer.set(transfer);
        this.dialogVisible.set(true);

        if (!this.catalogsReady() && !this.loadingCatalogs()) {
            this.loadCatalogs();
        }
    }

    private loadTransfer(transferId: number, mode: 'view' | 'edit'): void {
        if (this.loadingTransfer()) {
            return;
        }

        this.loadingTransfer.set(true);

        this.transfersService
            .getById(transferId)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loadingTransfer.set(false)),
            )
            .subscribe({
                next: (response) => {
                    const transfer = response.data;

                    if (mode === 'view') {
                        this.selectedDetailsTransfer.set(transfer);
                        this.detailsVisible.set(true);
                        return;
                    }

                    if (transfer.status !== 'DRAFT') {
                        this.toast.warn(
                            'Transferencia no editable',
                            'Solo puede editar transferencias en estado borrador.',
                        );

                        this.loadTransfers();
                        return;
                    }

                    this.selectedTransfer.set(transfer);
                    this.dialogVisible.set(true);

                    if (!this.catalogsReady() && !this.loadingCatalogs()) {
                        this.loadCatalogs();
                    }
                },
                error: () => {
                    this.toast.error(
                        'Error al cargar',
                        'No fue posible obtener los detalles de la transferencia.',
                    );
                },
            });
    }

    saveTransfer(): void {
        if (this.saving() || !this.catalogsReady()) {
            return;
        }

        const payload = this.transferForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedTransfer();

        if (selected && (!this.canEdit() || selected.status !== 'DRAFT')) {
            return;
        }

        if (!selected && !this.canCreate()) {
            return;
        }

        this.saving.set(true);

        const request$ = selected
            ? this.transfersService.update(selected.warehouse_transfer_id, payload)
            : this.transfersService.create(payload);

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
                            ? 'La transferencia se actualizó correctamente.'
                            : 'La transferencia se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedTransfer.set(null);
                    this.loadTransfers();
                },
                error: (error) => {
                    const problem = getProblemDetails(error);

                    this.toast.error(
                        'Error al guardar',
                        problem?.detail ?? 'No fue posible guardar la transferencia.',
                    );
                },
            });
    }

    onDispatch(transfer: WarehouseTransfer): void {
        if (!this.canDispatch()) {
            return;
        }

        if (transfer.status !== 'DRAFT') {
            this.toast.warn(
                'Operación no permitida',
                'Solo puede despachar transferencias en estado borrador.',
            );
            return;
        }

        this.confirmOperation(
            transfer,
            'dispatch',
            'Despachar transferencia',
            'Esta operación descontará los productos del inventario de origen. ¿Desea continuar?',
            'Sí, despachar',
            'info',
        );
    }

    onReceive(transfer: WarehouseTransfer): void {
        if (!this.canReceive()) {
            return;
        }

        if (transfer.status !== 'IN_TRANSIT') {
            this.toast.warn(
                'Operación no permitida',
                'Solo puede recibir transferencias en tránsito.',
            );
            return;
        }

        this.confirmOperation(
            transfer,
            'receive',
            'Recibir transferencia',
            'Esta operación ingresará los productos al inventario de destino. ¿Desea continuar?',
            'Sí, recibir',
            'success',
        );
    }

    onCancel(transfer: WarehouseTransfer): void {
        if (!this.canCancel()) {
            return;
        }

        if (transfer.status !== 'DRAFT') {
            this.toast.warn(
                'Operación no permitida',
                'Solo puede cancelar transferencias en estado borrador.',
            );
            return;
        }

        this.confirmOperation(
            transfer,
            'cancel',
            'Cancelar transferencia',
            'Esta acción no se puede deshacer. ¿Desea continuar?',
            'Sí, cancelar',
            'danger',
        );
    }

    private confirmOperation(
        transfer: WarehouseTransfer,
        operation: TransferOperation,
        header: string,
        message: string,
        acceptLabel: string,
        severity: 'success' | 'danger' | 'info',
    ): void {
        if (this.processingTransferId() !== null) {
            return;
        }

        this.confirmDialog.confirm({
            header,
            message: `${message} Transferencia: ${transfer.transfer_number}`,
            icon: severity === 'danger' ? 'pi pi-exclamation-triangle' : 'pi pi-check-circle',
            acceptLabel,
            rejectLabel: 'Volver',
            acceptButtonSeverity: severity,
            accept: () => this.executeOperation(transfer.warehouse_transfer_id, operation),
        });
    }

    private executeOperation(transferId: number, operation: TransferOperation): void {
        if (this.processingTransferId() !== null) {
            return;
        }

        const requests: Record<TransferOperation, () => Observable<unknown>> = {
            dispatch: () => this.transfersService.dispatch(transferId),
            receive: () => this.transfersService.receive(transferId),
            cancel: () => this.transfersService.cancel(transferId),
        };

        const successMessages: Record<TransferOperation, string> = {
            dispatch: 'La transferencia se despachó correctamente.',
            receive: 'La transferencia se recibió correctamente.',
            cancel: 'La transferencia se canceló correctamente.',
        };

        this.processingTransferId.set(transferId);

        requests[operation]()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.processingTransferId.set(null)),
            )
            .subscribe({
                next: () => {
                    this.toast.success('Operación exitosa', successMessages[operation]);

                    this.loadTransfers();
                    this.refreshSelectedDetails(transferId);
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

    private refreshSelectedDetails(transferId: number): void {
        if (
            !this.detailsVisible() ||
            this.selectedDetailsTransfer()?.warehouse_transfer_id !== transferId
        ) {
            return;
        }

        this.transfersService
            .getById(transferId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    this.selectedDetailsTransfer.set(response.data);
                },
                error: () => {
                    this.toast.error(
                        'Error al actualizar',
                        'No fue posible actualizar los detalles de la transferencia.',
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
                        warehouses: this.getAllPages((params) =>
                            this.warehousesService.getAll(params),
                        ),
                        products: this.getAllPages((params) => this.productsService.getAll(params)),
                        batches: this.getAllPages((params) =>
                            this.productBatchesService.getAll(params),
                        ),
                    }).pipe(
                        map((items) => ({
                            ...items,
                            failed: false as const,
                        })),
                        catchError(() =>
                            of({
                                warehouses: [] as Warehouse[],
                                products: [] as Product[],
                                batches: [] as ProductBatch[],
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
                        'No fue posible obtener bodegas, productos o lotes.',
                    );
                    return;
                }

                this.warehouses.set(result.warehouses);
                this.products.set(result.products);
                this.batches.set(result.batches);
                this.catalogsReady.set(true);
            });
    }

    onDetailsOperation(transferId: number, operation: TransferOperation): void {
        const transfer = this.selectedDetailsTransfer();

        if (!transfer || transfer.warehouse_transfer_id !== transferId) {
            return;
        }

        switch (operation) {
            case 'dispatch':
                this.onDispatch(transfer);
                break;

            case 'receive':
                this.onReceive(transfer);
                break;

            case 'cancel':
                this.onCancel(transfer);
                break;
        }
    }

    private getWarehouseName(id: number): string {
        const warehouse = this.warehouses().find((item) => item.warehouse_id === id);

        return warehouse ? `${warehouse.code} - ${warehouse.name}` : `Bodega #${id}`;
    }

    private formatDate(value: string | null): string {
        if (!value) {
            return 'Sin definir';
        }

        const [year, month, day] = value.slice(0, 10).split('-');

        return `${day}/${month}/${year}`;
    }
}
