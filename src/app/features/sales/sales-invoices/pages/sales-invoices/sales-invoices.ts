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

import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';

import { SalesInvoice, SalesInvoiceWithDetails } from '../../models/sales-invoice.model';

import { SalesInvoicesService } from '../../services/sales-invoices.service';

import { SalesInvoicesForm } from '../../components/sales-invoices-form/sales-invoices-form';
import { SalesInvoiceDetails } from '../../components/sales-invoice-details/sales-invoice-details';

import { SalesOrdersService } from '../../../sales-orders/services/sales-orders.service';

import { SalesOrder, SalesOrderWithDetails } from '../../../sales-orders/models/sales-order.model';

import { CustomersService } from '../../../customers/services/customers.service';
import { Customer } from '../../../customers/models/customer.model';

import { ProductsService } from '../../../../catalog/products/services/products.service';
import { Product } from '../../../../catalog/products/models/product.model';

import { DataGrid } from '../../../../../shared/components/data-grid/components/data-grid/data-grid';
import { FormDialog } from '../../../../../shared/components/form-dialog/form-dialog';

import { AuthService } from '../../../../../core/auth/services/auth.service';
import { ToastService } from '../../../../../core/services/toast.service';

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
    selector: 'app-sales-invoices',
    imports: [
        FormsModule,
        DataGrid,
        FormDialog,
        ButtonModule,
        DialogModule,
        TextareaModule,
        MessageModule,
        SalesInvoicesForm,
        SalesInvoiceDetails,
    ],
    templateUrl: './sales-invoices.html',
    styleUrl: './sales-invoices.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesInvoices {
    private readonly destroyRef = inject(DestroyRef);
    private readonly authService = inject(AuthService);
    private readonly toastService = inject(ToastService);

    private readonly salesInvoicesService = inject(SalesInvoicesService);
    private readonly salesOrdersService = inject(SalesOrdersService);
    private readonly customersService = inject(CustomersService);
    private readonly productsService = inject(ProductsService);

    readonly invoices = signal<SalesInvoice[]>([]);
    readonly loading = signal(false);
    readonly error = signal<boolean>(false);

    readonly dialogVisible = signal(false);
    readonly saving = signal(false);

    readonly invoiceForm = viewChild(SalesInvoicesForm);

    readonly detailsVisible = signal(false);
    readonly selectedDetailsInvoice = signal<SalesInvoiceWithDetails | null>(null);

    readonly cancelDialogVisible = signal(false);
    readonly selectedCancelInvoice = signal<SalesInvoiceWithDetails | null>(null);
    readonly cancellationReason = signal('');
    readonly cancelling = signal(false);

    readonly salesOrders = signal<SalesOrder[]>([]);
    readonly reservedOrders = signal<SalesOrderWithDetails[]>([]);
    readonly customers = signal<Customer[]>([]);
    readonly products = signal<Product[]>([]);

    readonly loadingCatalogs = signal(false);
    readonly catalogsError = signal(false);
    readonly catalogsReady = signal(false);

    readonly processingInvoiceId = signal<number | null>(null);

    private readonly catalogsLoadSubject = new Subject<void>();

    readonly canCreate = computed(() => this.authService.hasPermission('SALES_INVOICE_CREATE'));

    readonly canCancel = computed(() => this.authService.hasPermission('SALES_INVOICE_CANCEL'));

    readonly dialogTitle = computed(() => 'Emitir factura de venta');

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<SalesInvoice>[] = [
        {
            field: 'invoice_number',
            header: 'No. factura',
            width: '180px',
            valueGetter: (invoice) => `${invoice.invoice_series}-${invoice.invoice_number}`,
        },
        {
            field: 'sales_order_id',
            header: 'Orden de venta',
            width: '180px',
            valueGetter: (invoice) => this.getOrderNumber(invoice.sales_order_id),
        },
        {
            field: 'customer_id',
            header: 'Cliente',
            width: '200px',
            valueGetter: (invoice) => this.getCustomerName(invoice.customer_id),
        },
        {
            field: 'invoice_date',
            header: 'Fecha de emisión',
            width: '160px',
            valueGetter: (invoice) => this.formatDate(invoice.invoice_date),
        },
        {
            field: 'due_date',
            header: 'Vencimiento',
            width: '160px',
            valueGetter: (invoice) => this.formatDate(invoice.due_date),
        },
        {
            field: 'total_amount',
            header: 'Total',
            width: '160px',
            valueGetter: (invoice) => this.formatCurrency(invoice.total_amount),
        },
        {
            field: 'status',
            header: 'Estado',
            width: '140px',
            valueGetter: (invoice) => this.getStatusLabel(invoice.status),
        },
    ];

    readonly gridConfig = computed<DataGridConfig<SalesInvoice>>(() => ({
        dataKey: 'sales_invoice_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.canCreate(),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay facturas de venta registradas',
    }));

    readonly actions = computed<DataGridAction<SalesInvoice>[]>(() => {
        const actions: DataGridAction<SalesInvoice>[] = [
            {
                id: 'view',
                label: 'Ver detalles',
                icon: 'pi pi-eye',
                severity: 'secondary',
            },
        ];

        if (this.canCancel()) {
            actions.push({
                id: 'cancel',
                label: 'Cancelar',
                icon: 'pi pi-times',
                severity: 'danger',
                visible: (invoice) => invoice.status === 'ISSUED',
            });
        }

        return actions;
    });

    private readonly currencyFormatter = new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    constructor() {
        this.setupCatalogsLoader();
        this.loadInvoices();
        this.loadCatalogs();
    }

    loadInvoices(params?: PaginationParams): void {
        const query = params ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.salesInvoicesService
            .getAll(query)
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
                    this.toastService.error(
                        'Error',
                        'No se pudieron cargar las facturas de venta.',
                    );
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

    onAction(event: DataGridActionEvent<SalesInvoice>): void {
        switch (event.action) {
            case 'view':
                this.onView(event.row);
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

        this.dialogVisible.set(true);
        this.loadCatalogs();
    }

    onView(invoice: SalesInvoice): void {
        this.salesInvoicesService
            .getByIdWithDetails(invoice.sales_invoice_id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (result) => {
                    this.selectedDetailsInvoice.set(result);
                    this.detailsVisible.set(true);
                },
                error: () => {
                    this.toastService.error('Error', 'No se pudo cargar la factura.');
                },
            });
    }

    saveInvoice(): void {
        if (this.saving() || !this.canCreate()) {
            return;
        }

        const form = this.invoiceForm();

        if (!form) {
            this.toastService.error('Error', 'No se pudo obtener el formulario de facturación.');
            return;
        }

        const payload = form.getPayload();

        if (!payload) {
            this.toastService.error(
                'Formulario incompleto',
                'Verifique la orden de venta, la serie y el número de factura.',
            );
            return;
        }

        this.saving.set(true);

        this.salesInvoicesService
            .create(payload)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.saving.set(false)),
            )
            .subscribe({
                next: () => {
                    this.toastService.success(
                        'Factura emitida',
                        'La factura fue emitida correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.loadInvoices();
                    this.loadCatalogs();
                },
                error: (error) => {
                    if (form.applyValidationErrors(error)) {
                        return;
                    }

                    const problem = getProblemDetails(error);

                    this.toastService.error(
                        'Error al emitir factura',
                        problem?.detail ?? 'No fue posible emitir la factura.',
                    );
                },
            });
    }

    onCancel(invoice: SalesInvoice): void {
        if (
            !this.canCancel() ||
            invoice.status !== 'ISSUED' ||
            this.processingInvoiceId() !== null
        ) {
            return;
        }

        this.salesInvoicesService
            .getByIdWithDetails(invoice.sales_invoice_id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (result) => {
                    if (result.status !== 'ISSUED') {
                        this.toastService.error(
                            'Operación no permitida',
                            'La factura ya no se encuentra emitida.',
                        );
                        return;
                    }

                    this.selectedCancelInvoice.set(result);
                    this.cancellationReason.set('');
                    this.cancelDialogVisible.set(true);
                },
                error: () => {
                    this.toastService.error('Error', 'No se pudo cargar la factura.');
                },
            });
    }

    confirmCancellation(): void {
        const invoice = this.selectedCancelInvoice();
        const reason = this.cancellationReason().trim();

        if (
            !invoice ||
            !this.canCancel() ||
            invoice.status !== 'ISSUED' ||
            !reason ||
            reason.length > 500 ||
            this.cancelling()
        ) {
            return;
        }

        this.cancelling.set(true);
        this.processingInvoiceId.set(invoice.sales_invoice_id);

        this.salesInvoicesService
            .cancel(invoice.sales_invoice_id, {
                cancellation_reason: reason,
            })
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => {
                    this.cancelling.set(false);
                    this.processingInvoiceId.set(null);
                }),
            )
            .subscribe({
                next: () => {
                    this.toastService.success(
                        'Factura cancelada',
                        'La factura fue cancelada correctamente.',
                    );

                    this.cancelDialogVisible.set(false);
                    this.selectedCancelInvoice.set(null);
                    this.cancellationReason.set('');

                    this.loadInvoices();
                    this.refreshDetails(invoice.sales_invoice_id);
                },
                error: (error) => {
                    const problem = getProblemDetails(error);

                    this.toastService.error(
                        'Error al cancelar',
                        problem?.detail ?? 'No fue posible cancelar la factura.',
                    );
                },
            });
    }

    private refreshDetails(id: number): void {
        if (!this.detailsVisible() || this.selectedDetailsInvoice()?.sales_invoice_id !== id) {
            return;
        }

        this.salesInvoicesService
            .getByIdWithDetails(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (invoice) => this.selectedDetailsInvoice.set(invoice),
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
                            this.salesOrdersService.getAll(params),
                        ),
                        customers: this.getAllPages((params) =>
                            this.customersService.getAll(params),
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

                this.salesOrders.set(result.data.orders);
                this.customers.set(result.data.customers);
                this.products.set(result.data.products);

                this.loadOrderDetails(result.data.orders);
            });
    }

    private loadOrderDetails(orders: SalesOrder[]): void {
        const eligibleOrders = orders.filter((order) => order.status === 'RESERVED');

        if (!eligibleOrders.length) {
            this.reservedOrders.set([]);
            this.catalogsReady.set(true);
            return;
        }

        forkJoin(
            eligibleOrders.map((order) => this.salesOrdersService.getById(order.sales_order_id)),
        )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (responses) => {
                    this.reservedOrders.set(
                        responses
                            .map((response) => response.data)
                            .filter((order) => order.status === 'RESERVED'),
                    );

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
            this.salesOrders().find((order) => order.sales_order_id === id)?.order_number ??
            `Orden #${id}`
        );
    }

    getCustomerName(id: number): string {
        const customer = this.customers().find((item) => item.customer_id === id);

        return customer ? `Cliente #${customer.customer_id}` : `Cliente #${id}`;
    }

    getStatusLabel(status: SalesInvoice['status']): string {
        const labels: Record<SalesInvoice['status'], string> = {
            ISSUED: 'Emitida',
            CANCELLED: 'Cancelada',
        };

        return labels[status];
    }

    formatCurrency(value: number): string {
        return this.currencyFormatter.format(Number(value));
    }

    formatDate(value: string | null): string {
        if (!value) {
            return 'No definida';
        }

        const [year, month, day] = value.slice(0, 10).split('-');

        return `${day}/${month}/${year}`;
    }
}
