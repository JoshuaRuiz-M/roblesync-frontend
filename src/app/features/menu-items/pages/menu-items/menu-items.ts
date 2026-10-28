import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    signal,
    computed,
    viewChild,
} from '@angular/core';

import { catchError, finalize, forkJoin, map, of, Subject, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { DataGridColumn } from '../../../../shared/components/data-grid/models/data-grid-column.model';
import type { DataGridConfig } from '../../../../shared/components/data-grid/models/data-grid-config.model';
import type {
    DataGridAction,
    DataGridActionEvent,
} from '../../../../shared/components/data-grid/models/data-grid-action.model';
import type { DataGridQuery } from '../../../../shared/components/data-grid/models/data-grid-query.model';

import type {
    PaginationMeta,
    PaginationParams,
} from '../../../../core/http/models/pagination.model';

import { PAGINATION_DEFAULTS } from '../../../../core/http/models/pagination.model';

import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

import { MenuItemsService } from '../../services/menu-items.service';
import type { MenuItem } from '../../models/menu-item.model';

import { FormDialog } from '../../../../shared/components/form-dialog/form-dialog';

import { MenuItemForm } from '../../components/menu-item-form/menu-item-form';

import type { CreateMenuItem, UpdateMenuItem } from '../../models/menu-item.model';
import { ButtonModule } from 'primeng/button';
import { DataGrid } from '../../../../shared/components/data-grid/components/data-grid/data-grid';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
    selector: 'app-menu-items',
    imports: [DataGrid, FormDialog, MenuItemForm, ButtonModule],
    templateUrl: './menu-items.html',
    styleUrl: './menu-items.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuItems {
    private readonly authService = inject(AuthService);
    private readonly menuItemsService = inject(MenuItemsService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly menuItems = signal<MenuItem[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedMenuItem = signal<MenuItem | null>(null);
    readonly parentItems = signal<MenuItem[]>([]);
    readonly loadingParents = signal(false);
    readonly saving = signal(false);

    readonly menuItemForm = viewChild(MenuItemForm);

    readonly dialogTitle = computed(() =>
        this.selectedMenuItem() ? 'Editar opción de menú' : 'Nueva opción de menú',
    );

    private readonly querySubject = new Subject<PaginationParams>();
    private readonly parentLoadSubject = new Subject<void>();
    readonly parentsError = signal(false);
    readonly parentsReady = signal(false);

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<MenuItem>[] = [
        {
            field: 'code',
            header: 'Código',
        },
        {
            field: 'label',
            header: 'Nombre',
        },
        {
            field: 'path',
            header: 'Ruta',
        },
        {
            field: 'sort_order',
            header: 'Orden',
            type: 'number',
            width: '90px',
        },
        {
            field: 'is_active',
            header: 'Estado',
            type: 'boolean',
            width: '110px',
        },
        {
            field: 'created_at',
            header: 'Creado',
            type: 'date',
            width: '130px',
        },
    ];

    readonly gridConfig = computed<DataGridConfig<MenuItem>>(() => ({
        dataKey: 'menu_item_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('MENU_ITEM_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay opciones de menú registradas',
    }));

    readonly actions = computed<DataGridAction<MenuItem>[]>(() => {
        const actions: DataGridAction<MenuItem>[] = [];

        if (this.authService.hasPermission('MENU_ITEM_UPDATE')) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });
        }

        if (this.authService.hasPermission('MENU_ITEM_DELETE')) {
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
        this.setupMenuItemsLoader();
        this.setupParentItemsLoader();

        this.loadMenuItems();
    }

    loadMenuItems(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.querySubject.next(params);
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadMenuItems({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadMenuItems();
    }

    onCreate(): void {
        this.selectedMenuItem.set(null);
        this.parentItems.set([]);
        this.dialogVisible.set(true);

        this.menuItemForm()?.resetForm(null);

        this.loadParentItems();
    }

    onAction(event: DataGridActionEvent<MenuItem>): void {
        switch (event.action) {
            case 'edit':
                this.onEdit(event.row);
                break;

            case 'delete':
                this.onDelete(event.row);
                break;
        }
    }

    private onEdit(menuItem: MenuItem): void {
        this.selectedMenuItem.set(menuItem);
        this.parentItems.set([]);
        this.dialogVisible.set(true);

        this.menuItemForm()?.resetForm(menuItem);

        this.loadParentItems();
    }

    private onDelete(menuItem: MenuItem): void {
        this.confirmDialog.delete(`¿Está seguro de que desea eliminar "${menuItem.label}"?`, () =>
            this.deleteMenuItem(menuItem.menu_item_id),
        );
    }

    private deleteMenuItem(menuItemId: number): void {
        this.menuItemsService
            .delete(menuItemId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Opción eliminada',
                        'La opción de menú se eliminó correctamente.',
                    );

                    this.loadMenuItems();
                },
                error: (error) => {
                    if (error.status === 409) {
                        this.toast.warn(
                            'No se puede eliminar',
                            'La opción tiene elementos hijos o asignaciones a roles.',
                        );
                        return;
                    }

                    this.toast.error(
                        'Error al eliminar',
                        'No fue posible eliminar la opción de menú.',
                    );
                },
            });
    }

    saveMenuItem(): void {
        if (this.saving() || this.loadingParents() || !this.parentsReady()) {
            return;
        }

        const payload = this.menuItemForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedMenuItem();

        this.saving.set(true);

        const request$ = selected
            ? this.menuItemsService.update(selected.menu_item_id, payload as UpdateMenuItem)
            : this.menuItemsService.create(payload as CreateMenuItem);

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
                            ? 'La opción de menú se actualizó correctamente.'
                            : 'La opción de menú se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedMenuItem.set(null);

                    this.loadMenuItems();
                },
                error: (error) => {
                    const applied = this.menuItemForm()?.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error(
                        'Error al guardar',
                        'No fue posible guardar la opción de menú.',
                    );
                },
            });
    }

    loadParentItems(): void {
        this.parentLoadSubject.next();
    }

    private setupMenuItemsLoader(): void {
        this.querySubject
            .pipe(
                tap(() => {
                    this.loading.set(true);
                    this.error.set(false);
                }),
                switchMap((params) =>
                    this.menuItemsService.getAll(params).pipe(
                        map((response) => ({
                            response,
                            failed: false as const,
                        })),
                        catchError(() =>
                            of({
                                response: null,
                                failed: true as const,
                            }),
                        ),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((result) => {
                this.loading.set(false);

                if (result.failed) {
                    this.error.set(true);
                    this.menuItems.set([]);

                    this.toast.error(
                        'Error al cargar',
                        'No fue posible obtener las opciones de menú.',
                    );

                    return;
                }

                this.menuItems.set(result.response.data);
                this.pagination.set(result.response.meta);
            });
    }

    private setupParentItemsLoader(): void {
        this.parentLoadSubject
            .pipe(
                tap(() => {
                    this.loadingParents.set(true);
                    this.parentsError.set(false);
                    this.parentsReady.set(false);
                    this.parentItems.set([]);
                }),
                switchMap(() =>
                    this.menuItemsService.getAll({ page: 1, limit: 100 }).pipe(
                        switchMap((firstPage) => {
                            const totalPages = firstPage.meta.totalPages;

                            if (totalPages <= 1) {
                                return of(firstPage.data);
                            }

                            const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
                                this.menuItemsService.getAll({
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
                                items: [] as MenuItem[],
                                failed: true as const,
                            }),
                        ),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((result) => {
                this.loadingParents.set(false);

                if (result.failed) {
                    this.parentsError.set(true);
                    this.parentsReady.set(false);
                    this.parentItems.set([]);

                    this.toast.error(
                        'Error al cargar opciones',
                        'No fue posible obtener las opciones padre.',
                    );

                    return;
                }

                this.parentItems.set(result.items);
                this.parentsReady.set(true);
            });
    }
}
