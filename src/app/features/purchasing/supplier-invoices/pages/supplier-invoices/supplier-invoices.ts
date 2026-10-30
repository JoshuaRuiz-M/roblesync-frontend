import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';

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

import { FormDialog } from '../../../../../shared/components/form-dialog/form-dialog';

import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import { PurchaseOrdersService } from '../../../purchase-orders/services/purchase-orders.service';

import type {
    SupplierInvoice,
    CreateSupplierInvoice,
    UpdateSupplierInvoice,
} from '../../models/supplier-invoice.model';
import type { Supplier } from '../../../suppliers/models/supplier.model';
import type { PurchaseOrder } from '../../../purchase-orders/models/purchase-order.model';

import { SUPPLIER_INVOICE_STATUS_LABELS } from '../../models/supplier-invoice-status.model';

import { SupplierInvoicesForm } from '../../components/supplier-invoices-form/supplier-invoices-form';
import { SupplierInvoiceDetails } from '../../components/supplier-invoices-form/supplier-invoice-details/supplier-invoice-details';
import { SupplierInvoicesService } from '../../services/supplier-invoice.service';
import { DataGridColumn } from '../../../../../shared/components/data-grid/models/data-grid-column.model';
import { DataGridConfig } from '../../../../../shared/components/data-grid/models/data-grid-config.model';
import {
    DataGridAction,
    DataGridActionEvent,
} from '../../../../../shared/components/data-grid/models/data-grid-action.model';
import { DataGridQuery } from '../../../../../shared/components/data-grid/models/data-grid-query.model';
import { getProblemDetails } from '../../../../../core/http/utils/problem-details.util';

@Component({
    selector: 'app-supplier-invoices',
    imports: [DataGrid, FormDialog, SupplierInvoicesForm, SupplierInvoiceDetails, ButtonModule],
    templateUrl: './supplier-invoices.html',
    styleUrl: './supplier-invoices.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierInvoices {
    private readonly authService = inject(AuthService);
    private readonly invoicesService = inject(SupplierInvoicesService);
    private readonly suppliersService = inject(SuppliersService);
    private readonly purchaseOrdersService = inject(PurchaseOrdersService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly invoices = signal<SupplierInvoice[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly detailsVisible = signal(false);
    readonly selectedInvoice = signal<SupplierInvoice | null>(null);
    readonly selectedDetailsInvoice = signal<SupplierInvoice | null>(null);
    readonly saving = signal(false);

    readonly supplierItems = signal<Supplier[]>([]);
    readonly purchaseOrderItems = signal<PurchaseOrder[]>([]);
    readonly loadingCatalogs = signal(false);
    readonly catalogsError = signal(false);
    readonly catalogsReady = signal(false);

    readonly invoiceForm = viewChild(SupplierInvoicesForm);

    readonly dialogTitle = computed(() =>
        this.selectedInvoice() ? 'Editar factura' : 'Nueva factura',
    );

    readonly canEditInvoice = computed(() =>
        this.authService.hasPermission('SUPPLIER_INVOICE_UPDATE'),
    );

    private readonly catalogsLoadSubject = new Subject<void>();

    readonly pagination = signal<PaginationMeta>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    private readonly currencyFormatter = new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    readonly columns: DataGridColumn<SupplierInvoice>[] = [
        {
            field: 'invoice_number',
            header: 'Número de factura',
            width: '180px',
        },
        {
            field: 'supplier_id',
            header: 'Proveedor',
            width: '240px',
            valueGetter: (row) =>
                this.supplierItems().find((item) => item.supplier_id === row.supplier_id)
                    ?.business_name ?? `#${row.supplier_id}`,
        },
        {
            field: 'purchase_order_id',
            header: 'Orden de compra',
            width: '180px',
            valueGetter: (row) =>
                this.purchaseOrderItems().find(
                    (item) => item.purchase_order_id === row.purchase_order_id,
                )?.order_number ?? `#${row.purchase_order_id}`,
        },
        {
            field: 'invoice_date',
            header: 'Emisión',
            width: '130px',
            valueGetter: (row) => this.formatDate(row.invoice_date),
        },
        {
            field: 'due_date',
            header: 'Vencimiento',
            width: '130px',
            valueGetter: (row) => this.formatDate(row.due_date),
        },
        {
            field: 'total_amount',
            header: 'Total',
            width: '150px',
            valueGetter: (row) => this.currencyFormatter.format(Number(row.total_amount)),
        },
        {
            field: 'status',
            header: 'Estado',
            width: '140px',
            valueGetter: (row) => SUPPLIER_INVOICE_STATUS_LABELS[row.status],
        },
    ];

    readonly gridConfig = computed<DataGridConfig<SupplierInvoice>>(() => ({
        dataKey: 'supplier_invoice_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('SUPPLIER_INVOICE_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay facturas de proveedores registradas',
    }));

    readonly actions = computed<DataGridAction<SupplierInvoice>[]>(() => {
        const actions: DataGridAction<SupplierInvoice>[] = [
            {
                id: 'view',
                label: 'Ver detalles',
                icon: 'pi pi-eye',
                severity: 'secondary',
            },
        ];

        if (this.authService.hasPermission('SUPPLIER_INVOICE_UPDATE')) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });
        }

        if (this.authService.hasPermission('SUPPLIER_INVOICE_DELETE')) {
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
        this.loadInvoices();
        this.loadCatalogs();
    }

    loadInvoices(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.invoicesService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.invoices.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);
                    this.invoices.set([]);
                    this.toast.error('Error al cargar', 'No fue posible obtener las facturas.');
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadInvoices({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadInvoices();
        this.loadCatalogs();
    }

    onAction(event: DataGridActionEvent<SupplierInvoice>): void {
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

    onView(invoice: SupplierInvoice): void {
        this.selectedDetailsInvoice.set(invoice);
        this.detailsVisible.set(true);
    }

    onCreate(): void {
        this.selectedInvoice.set(null);
        this.dialogVisible.set(true);
        this.invoiceForm()?.resetForm(null);

        if (!this.catalogsReady() && !this.loadingCatalogs()) {
            this.loadCatalogs();
        }
    }

    onEditFromDetails(invoice: SupplierInvoice): void {
        this.detailsVisible.set(false);
        this.onEdit(invoice);
    }

    private onEdit(invoice: SupplierInvoice): void {
        this.selectedInvoice.set(invoice);
        this.dialogVisible.set(true);
        this.invoiceForm()?.resetForm(invoice);

        if (!this.catalogsReady() && !this.loadingCatalogs()) {
            this.loadCatalogs();
        }
    }

    private onDelete(invoice: SupplierInvoice): void {
        this.confirmDialog.delete(
            `¿Está seguro de que desea eliminar la factura "${invoice.invoice_number}"?`,
            () => this.deleteInvoice(invoice.supplier_invoice_id),
        );
    }

    private deleteInvoice(invoiceId: number): void {
        this.invoicesService
            .delete(invoiceId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success('Factura eliminada', 'La factura se eliminó correctamente.');

                    if (this.invoices().length === 1 && this.pagination().page > 1) {
                        this.pagination.update((meta) => ({
                            ...meta,
                            page: meta.page - 1,
                        }));
                    }

                    this.loadInvoices();
                },
                error: () => {
                    this.toast.error('Error al eliminar', 'No fue posible eliminar la factura.');
                },
            });
    }

    saveInvoice(): void {
        if (this.saving() || !this.catalogsReady()) return;

        const payload = this.invoiceForm()?.getPayload();
        if (!payload) return;

        const selected = this.selectedInvoice();
        this.saving.set(true);

        const request$ = selected
            ? this.invoicesService.update(
                  selected.supplier_invoice_id,
                  payload as UpdateSupplierInvoice,
              )
            : this.invoicesService.create(payload as CreateSupplierInvoice);

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
                            ? 'La factura se actualizó correctamente.'
                            : 'La factura se registró correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedInvoice.set(null);
                    this.loadInvoices();
                },
                error: (error) => {
                    if (this.invoiceForm()?.applyValidationErrors(error)) {
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
                        suppliers: this.getAllPages((params) =>
                            this.suppliersService.getAll(params),
                        ),
                        orders: this.getAllPages((params) =>
                            this.purchaseOrdersService.getAll(params),
                        ),
                    }).pipe(
                        map((items) => ({
                            ...items,
                            failed: false as const,
                        })),
                        catchError(() =>
                            of({
                                suppliers: [] as Supplier[],
                                orders: [] as PurchaseOrder[],
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
                        'No fue posible obtener los proveedores y las órdenes de compra.',
                    );
                    return;
                }

                this.supplierItems.set(result.suppliers);
                this.purchaseOrderItems.set(result.orders);
                this.catalogsReady.set(true);
            });
    }

    private formatDate(value: Date | string): string {
        const date = value instanceof Date ? value : new Date(value);

        if (Number.isNaN(date.getTime())) return '—';

        return new Intl.DateTimeFormat('es-GT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(date);
    }
}
