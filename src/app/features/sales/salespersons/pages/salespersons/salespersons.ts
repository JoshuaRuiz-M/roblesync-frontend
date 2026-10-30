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
import { SalespersonsService } from '../../services/salespersons.service';
import { UsersService } from '../../../../users/services/users.service';
import { User } from '../../../../users/models/user.model';
import { CreateSaleperson, Saleperson } from '../../models/salesperson.model';
import { SalespersonsForm } from '../../components/salespersons-form/salespersons-form';

@Component({
    selector: 'app-salesperson',
    imports: [DataGrid, FormDialog, SalespersonsForm, Button],
    templateUrl: './salespersons.html',
    styleUrl: './salespersons.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Salespersons {
    private readonly authService = inject(AuthService);
    private readonly salespersonsService = inject(SalespersonsService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly salespersons = signal<Saleperson[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedSalesperson = signal<Saleperson | null>(null);

    readonly saving = signal(false);
    readonly salespersonsForm = viewChild(SalespersonsForm);
    readonly dialogTitle = computed(() =>
        this.selectedSalesperson() ? 'Editar vendedor' : 'Nuevo vendedor',
    );

    private readonly usersService = inject(UsersService);

    readonly userItems = signal<User[]>([]);
    private readonly userLoadSubject = new Subject<void>();
    readonly usersError = signal(false);
    readonly usersReady = signal(false);
    readonly loadingUsers = signal(false);

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<Saleperson>[] = [
        {
            field: 'user_id',
            header: 'Usuario',
            width: '200px',
            valueGetter: (row) => {
                const user = this.userItems().find((item) => item.user_id === row.user_id);

                return user ? user.username : '';
            },
        },
        {
            field: 'employee_code',
            header: 'Código de empleado',
            width: '150px',
        },
        {
            field: 'phone',
            header: 'Teléfono',
            width: '250px',
        },
        {
            field: 'is_active',
            header: 'Estado',
            type: 'boolean',
            width: '110px',
        },
    ];

    readonly gridConfig = computed<DataGridConfig<Saleperson>>(() => ({
        dataKey: 'salesperson_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('SALESPERSON_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay líneas de vendedores registradas',
    }));

    readonly actions = computed<DataGridAction<Saleperson>[]>(() => {
        const actions: DataGridAction<Saleperson>[] = [];

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
        this.loadUsers();
        this.setupUserItemsLoader();
        this.loadUsersItems();
    }

    loadUsers(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.salespersonsService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.salespersons.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error('Error al cargar', 'No fue posible obtener los vendedores.');
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadUsers({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadUsers();
    }

    onAction(event: DataGridActionEvent<Saleperson>): void {
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
        this.selectedSalesperson.set(null);
        this.userItems.set([]);
        this.dialogVisible.set(true);

        this.salespersonsForm()?.resetForm(null);
        this.loadUsersItems();
    }

    private onEdit(salesperson: Saleperson): void {
        this.selectedSalesperson.set(salesperson);
        this.userItems.set([]);
        this.dialogVisible.set(true);

        this.salespersonsForm()?.resetForm(salesperson);
        this.loadUsersItems();
    }

    private onDelete(salesperson: Saleperson): void {
        this.confirmDialog.delete(
            `¿Está seguro de que desea eliminar el vendedor "${salesperson.employee_code}"?`,
            () => this.deleteSalesperson(salesperson.salesperson_id),
        );
    }

    private deleteSalesperson(salespersonId: number): void {
        this.salespersonsService
            .delete(salespersonId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Vendedor eliminado',
                        'El vendedor se eliminó correctamente.',
                    );

                    this.loadUsers();
                },
                error: () => {
                    this.toast.error('Error al eliminar', 'No fue posible eliminar el vendedor.');
                },
            });
    }

    saveSalesperson(): void {
        if (this.saving()) {
            return;
        }

        const payload = this.salespersonsForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedSalesperson();

        this.saving.set(true);

        const request$ = selected
            ? this.salespersonsService.update(selected.salesperson_id, payload)
            : this.salespersonsService.create(payload as CreateSaleperson);

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
                            ? 'El vendedor se actualizó correctamente.'
                            : 'El vendedor se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedSalesperson.set(null);

                    this.loadUsers();
                },
                error: (error) => {
                    const applied = this.salespersonsForm()?.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error('Error al guardar', 'No fue posible guardar el vendedor.');
                },
            });
    }

    loadUsersItems(): void {
        this.userLoadSubject.next();
    }

    private setupUserItemsLoader(): void {
        this.userLoadSubject
            .pipe(
                tap(() => {
                    this.loadingUsers.set(true);
                    this.usersError.set(false);
                    this.usersReady.set(false);
                    this.userItems.set([]);
                }),
                switchMap(() =>
                    this.usersService.getAll({ page: 1, limit: 100 }).pipe(
                        switchMap((firstPage) => {
                            const totalPages = firstPage.meta.totalPages;

                            if (totalPages <= 1) {
                                return of(firstPage.data);
                            }

                            const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
                                this.usersService.getAll({
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
                this.loadingUsers.set(false);

                if (result.failed) {
                    this.usersError.set(true);
                    this.usersReady.set(false);
                    this.userItems.set([]);

                    this.toast.error(
                        'Error al cargar vendedores',
                        'No fue posible obtener los vendedores.',
                    );

                    return;
                }

                this.userItems.set(result.items);
                this.usersReady.set(true);
            });
    }
}
