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

import { DataGrid } from '../../../../../shared/components/data-grid/components/data-grid/data-grid';

import { FormDialog } from '../../../../../shared/components/form-dialog/form-dialog';

import { AuthService } from '../../../../../core/auth/services/auth.service';

import { Button } from 'primeng/button';
import { CustomersService } from '../../services/customers.service';
import { User } from '../../../../users/models/user.model';
import { CreateCustomer, Customer } from '../../models/customer.model';
import { CustomersForm } from '../../components/customers-form/customers-form';
import { SalespersonsService } from '../../../salespersons/services/salespersons.service';
import { Saleperson } from '../../../salespersons/models/salesperson.model';
import { PriceList } from '../../../price-lists/models/price-list.model';
import { PriceListsService } from '../../../price-lists/services/price-lists.service';

@Component({
    selector: 'app-customers',
    imports: [DataGrid, FormDialog, CustomersForm, Button],
    templateUrl: './customers.html',
    styleUrl: './customers.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Customers {
    private readonly authService = inject(AuthService);
    private readonly customersService = inject(CustomersService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly customers = signal<Customer[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedCustomer = signal<Customer | null>(null);

    readonly saving = signal(false);
    readonly customersForm = viewChild(CustomersForm);
    readonly dialogTitle = computed(() =>
        this.selectedCustomer() ? 'Editar cliente' : 'Nuevo cliente',
    );

    private readonly salespersonsService = inject(SalespersonsService);

    readonly salespersonItems = signal<Saleperson[]>([]);
    private readonly salespersonLoadSubject = new Subject<void>();
    readonly salespersonError = signal(false);
    readonly salespersonReady = signal(false);
    readonly loadingSalespersons = signal(false);

    private readonly priceListsService = inject(PriceListsService);

    readonly priceListItems = signal<PriceList[]>([]);
    private readonly priceListLoadSubject = new Subject<void>();
    readonly priceListError = signal(false);
    readonly priceListReady = signal(false);
    readonly loadingPriceLists = signal(false);

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<Customer>[] = [
        {
            field: 'customer_code',
            header: 'Código',
            width: '150px',
        },
        {
            field: 'tax_id',
            header: 'NIT',
            width: '150px',
        },
        {
            field: 'business_name',
            header: 'Razón social',
            width: '200px',
        },
        {
            field: 'customer_type',
            header: 'Tipo de cliente',
            width: '200px',
        },
        {
            field: 'contact_name',
            header: 'Nombre de contacto',
            width: '200px',
        },
        {
            field: 'phone',
            header: 'Teléfono',
            width: '250px',
        },
        {
            field: 'email',
            header: 'Correo electrónico',
            width: '250px',
        },
        {
            field: 'address',
            header: 'Dirección',
            width: '250px',
        },
        {
            field: 'salesperson_id',
            header: 'Vendedor',
            width: '200px',
            valueGetter: (row) => {
                const salesperson = this.salespersonItems().find(
                    (item) => item.salesperson_id === row.salesperson_id,
                );

                return salesperson ? salesperson.employee_code : '';
            },
        },
        {
            field: 'price_list_id',
            header: 'Lista de precios',
            width: '200px',
            valueGetter: (row) => {
                const priceList = this.priceListItems().find(
                    (item) => item.price_list_id === row.price_list_id,
                );

                return priceList ? priceList.name : '';
            },
        },
        {
            field: 'credit_days',
            header: 'Días de crédito',
            width: '150px',
            type: 'number',
        },
        {
            field: 'credit_limit',
            header: 'Límite de crédito',
            width: '250px',
            type: 'number',
        },
        {
            field: 'is_credit_blocked',
            header: 'Bloqueo de crédito',
            type: 'boolean',
            width: '110px',
        },
        {
            field: 'is_active',
            header: 'Estado',
            type: 'boolean',
            width: '110px',
        },
    ];

    readonly gridConfig = computed<DataGridConfig<Customer>>(() => ({
        dataKey: 'customer_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('CUSTOMER_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay líneas de clientes registradas',
    }));

    readonly actions = computed<DataGridAction<Customer>[]>(() => {
        const actions: DataGridAction<Customer>[] = [];

        if (this.authService.hasPermission('CUSTOMER_UPDATE')) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });
        }

        if (this.authService.hasPermission('CUSTOMER_DELETE')) {
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
        this.loadCustomers();
        this.setupSalespersonItemsLoader();
        this.setupPriceListItemsLoader();
        this.loadSalespersonItems();
        this.loadPriceListsItems();
    }

    loadCustomers(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.customersService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.customers.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error('Error al cargar', 'No fue posible obtener los clientes.');
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadCustomers({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadCustomers();
    }

    onAction(event: DataGridActionEvent<Customer>): void {
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
        this.selectedCustomer.set(null);
        this.salespersonItems.set([]);
        this.dialogVisible.set(true);
        this.priceListItems.set([]);

        this.customersForm()?.resetForm(null);
        this.loadSalespersonItems();
        this.loadPriceListsItems();
    }

    private onEdit(salesperson: Customer): void {
        this.selectedCustomer.set(salesperson);
        this.salespersonItems.set([]);
        this.dialogVisible.set(true);
        this.priceListItems.set([]);

        this.customersForm()?.resetForm(salesperson);
        this.loadSalespersonItems();
        this.loadPriceListsItems();
    }

    private onDelete(customer: Customer): void {
        this.confirmDialog.delete(
            `¿Está seguro de que desea eliminar el cliente "${customer.business_name}"?`,
            () => this.deleteCustomer(customer.customer_id),
        );
    }

    private deleteCustomer(customerId: number): void {
        this.customersService
            .delete(customerId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success('Cliente eliminado', 'El cliente se eliminó correctamente.');

                    this.loadCustomers();
                },
                error: () => {
                    this.toast.error('Error al eliminar', 'No fue posible eliminar el cliente.');
                },
            });
    }

    saveCustomer(): void {
        if (this.saving()) {
            return;
        }

        const payload = this.customersForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedCustomer();

        this.saving.set(true);

        const request$ = selected
            ? this.customersService.update(selected.customer_id, payload)
            : this.customersService.create(payload as CreateCustomer);

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
                            ? 'El cliente se actualizó correctamente.'
                            : 'El cliente se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedCustomer.set(null);

                    this.loadCustomers();
                },
                error: (error) => {
                    const applied = this.customersForm()?.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error('Error al guardar', 'No fue posible guardar el cliente.');
                },
            });
    }

    loadSalespersonItems(): void {
        this.salespersonLoadSubject.next();
    }

    loadPriceListsItems(): void {
        this.priceListLoadSubject.next();
    }

    private setupSalespersonItemsLoader(): void {
        this.salespersonLoadSubject
            .pipe(
                tap(() => {
                    this.loadingSalespersons.set(true);
                    this.salespersonError.set(false);
                    this.salespersonReady.set(false);
                    this.salespersonItems.set([]);
                }),
                switchMap(() =>
                    this.salespersonsService.getAll({ page: 1, limit: 100 }).pipe(
                        switchMap((firstPage) => {
                            const totalPages = firstPage.meta.totalPages;

                            if (totalPages <= 1) {
                                return of(firstPage.data);
                            }

                            const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
                                this.salespersonsService.getAll({
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
                                items: [] as User[],
                                failed: true as const,
                            }),
                        ),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((result) => {
                this.loadingSalespersons.set(false);

                if (result.failed) {
                    this.salespersonError.set(true);
                    this.salespersonReady.set(false);
                    this.salespersonItems.set([]);

                    this.toast.error(
                        'Error al cargar vendedores',
                        'No fue posible obtener los vendedores.',
                    );

                    return;
                }

                this.salespersonItems.set(result.items);
                this.salespersonReady.set(true);
            });
    }

    private setupPriceListItemsLoader(): void {
        this.priceListLoadSubject
            .pipe(
                tap(() => {
                    this.loadingPriceLists.set(true);
                    this.priceListError.set(false);
                    this.priceListReady.set(false);
                    this.priceListItems.set([]);
                }),
                switchMap(() =>
                    this.priceListsService.getAll({ page: 1, limit: 100 }).pipe(
                        switchMap((firstPage) => {
                            const totalPages = firstPage.meta.totalPages;

                            if (totalPages <= 1) {
                                return of(firstPage.data);
                            }

                            const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
                                this.priceListsService.getAll({
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
                                items: [] as User[],
                                failed: true as const,
                            }),
                        ),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((result) => {
                this.loadingPriceLists.set(false);

                if (result.failed) {
                    this.priceListError.set(true);
                    this.priceListReady.set(false);
                    this.priceListItems.set([]);

                    this.toast.error(
                        'Error al cargar listas de precios',
                        'No fue posible obtener las listas de precios.',
                    );

                    return;
                }

                this.priceListItems.set(result.items);
                this.priceListReady.set(true);
            });
    }
}
