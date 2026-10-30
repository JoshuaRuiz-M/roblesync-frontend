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

import { SalesTargetsService } from '../../services/sales-targets.service';

import { Saleperson } from '../../../salespersons/models/salesperson.model';
import { SalespersonsService } from '../../../salespersons/services/salespersons.service';

import { CreateSalesTarget, SaleTarget } from '../../models/sales-targets.model';
import { SalesTargetsForm } from '../../components/sales-targets-form/sales-targets-form';

@Component({
    selector: 'app-sales-targets',
    imports: [DataGrid, FormDialog, SalesTargetsForm, Button],
    templateUrl: './sales-targets.html',
    styleUrl: './sales-targets.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesTargetsPage {
    private readonly authService = inject(AuthService);
    private readonly salesTargetsService = inject(SalesTargetsService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly salestargets = signal<SaleTarget[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedSalesTarget = signal<SaleTarget | null>(null);

    readonly saving = signal(false);
    readonly salestargetsForm = viewChild(SalesTargetsForm);
    readonly dialogTitle = computed(() =>
        this.selectedSalesTarget() ? 'Editar Objetivo de Venta' : 'Nuevo Objetivo de Venta',
    );

    private readonly salespersonsService = inject(SalespersonsService);

    readonly salespersonsItems = signal<Saleperson[]>([]);
    private readonly salespersonsLoadSubject = new Subject<void>();
    readonly salespersonsError = signal(false);
    readonly salespersonsReady = signal(false);
    readonly salespersonsLoading = signal(false);

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<SaleTarget>[] = [
        {
            field: 'salesperson_id',
            header: 'Codigo del vendedor',
            width: '200px',
            valueGetter: (row) => {
                const salesperson = this.salespersonsItems().find(
                    (item) => item.salesperson_id === row.salesperson_id,
                );

                return salesperson ? salesperson.employee_code : '';
            },
        },
        {
            field: 'target_year',
            header: 'Año objetivo',
            width: '200px',
        },
        {
            field: 'target_month',
            header: 'Mes objetivo',
            width: '200px',
        },
        {
            field: 'target_amount',
            header: 'Monto objetivo',
            width: '200px',
        },
    ];

    readonly gridConfig = computed<DataGridConfig<SaleTarget>>(() => ({
        dataKey: 'salesperson_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('SALESPERSON_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay líneas de vendedores registradas',
    }));

    readonly actions = computed<DataGridAction<SaleTarget>[]>(() => {
        const actions: DataGridAction<SaleTarget>[] = [];

        if (this.authService.hasPermission('SALESPERSON_UPDATE')) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });
        }

        if (this.authService.hasPermission('SALESPERSON_DELETE')) {
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
        this.loadsalestargets();
        this.setupSalespersonsLoader();
        this.loadSalespersonsItems();
    }

    loadsalestargets(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.salestargetsForm()?.resetForm(null);

        this.salesTargetsService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.salestargets.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error(
                        'Error al cargar',
                        'No fue posible obtener los objetivos de venta.',
                    );
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadsalestargets({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadsalestargets();
        this.loadSalespersonsItems();
    }

    onAction(event: DataGridActionEvent<SaleTarget>): void {
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
        this.selectedSalesTarget.set(null);
        this.salespersonsItems.set([]);
        this.dialogVisible.set(true);

        this.salestargetsForm()?.resetForm(null);
        this.loadSalespersonsItems();
    }

    private onEdit(salesperson: SaleTarget): void {
        this.selectedSalesTarget.set(salesperson);
        this.salespersonsItems.set([]);
        this.dialogVisible.set(true);

        this.salestargetsForm()?.resetForm(salesperson);
        this.loadSalespersonsItems();
    }

    private onDelete(salestarget: SaleTarget): void {
        this.confirmDialog.delete(
            `¿Está seguro de que desea eliminar el objetivo de venta "${salestarget.sales_target_id}"?`,
            () => this.deleteSalesperson(salestarget.salesperson_id),
        );
    }

    private deleteSalesperson(salestargetId: number): void {
        this.salesTargetsService
            .delete(salestargetId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Objetivo de Venta eliminado',
                        'El objetivo de venta se eliminó correctamente.',
                    );

                    this.loadsalestargets();
                },
                error: () => {
                    this.toast.error(
                        'Error al eliminar',
                        'No fue posible eliminar el objetivo de venta.',
                    );
                },
            });
    }

    saveSalesTargets(): void {
        if (this.saving()) {
            return;
        }

        const payload = this.salestargetsForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedSalesTarget();

        this.saving.set(true);

        const request$ = selected
            ? this.salesTargetsService.update(selected.sales_target_id, payload)
            : this.salesTargetsService.create(payload as CreateSalesTarget);

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
                            ? 'El objetivo de venta se actualizó correctamente.'
                            : 'El objetivo de venta se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedSalesTarget.set(null);

                    this.loadsalestargets();
                },
                error: (error) => {
                    const applied = this.salestargetsForm()?.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error(
                        'Error al guardar',
                        'No fue posible guardar el objetivo de venta.',
                    );
                },
            });
    }

    loadSalespersonsItems(): void {
        this.salespersonsLoadSubject.next();
    }

    private setupSalespersonsLoader(): void {
        this.salespersonsLoadSubject
            .asObservable()
            .pipe(
                tap(() => {
                    this.salespersonsLoading.set(true);
                    this.salespersonsError.set(false);
                    this.salespersonsReady.set(false);
                    this.salespersonsItems.set([]);
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
                                items: [] as Saleperson[],
                                failed: true as const,
                            }),
                        ),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((result) => {
                this.salespersonsLoading.set(false);

                if (result.failed) {
                    this.salespersonsError.set(true);
                    this.salespersonsReady.set(false);
                    this.salespersonsItems.set([]);

                    this.toast.error(
                        'Error al cargar vendedores',
                        'No fue posible obtener los vendedores.',
                    );

                    return;
                }

                this.salespersonsItems.set(result.items);
                this.salespersonsReady.set(true);
            });
    }
}
