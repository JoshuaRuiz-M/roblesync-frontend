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
import { finalize } from 'rxjs';

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

import { RolesService } from '../../services/roles.service';
import type { Role } from '../../models/role.model';
import { RoleForm } from '../../components/role-form/role-form';
import { FormDialog } from '../../../../shared/components/form-dialog/form-dialog';
import { RolePermissions } from '../../components/role-permissions/role-permissions';
import { RoleMenuItems } from '../../components/role-menu-items/role-menu-items';
import { DataGrid } from '../../../../shared/components/data-grid/components/data-grid/data-grid';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
    selector: 'app-roles',
    imports: [DataGrid, FormDialog, RoleForm, RolePermissions, RoleMenuItems],
    templateUrl: './roles.html',
    styleUrl: './roles.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Roles {
    private readonly authService = inject(AuthService);
    private readonly rolesService = inject(RolesService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly roles = signal<Role[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedRole = signal<Role | null>(null);

    readonly saving = signal(false);
    readonly roleForm = viewChild(RoleForm);
    readonly dialogTitle = computed(() => (this.selectedRole() ? 'Editar rol' : 'Nuevo rol'));

    readonly permissionsDialogVisible = signal(false);
    readonly permissionsRole = signal<Role | null>(null);
    readonly rolePermissions = viewChild(RolePermissions);

    readonly menuItemsDialogVisible = signal(false);
    readonly menuItemsRole = signal<Role | null>(null);
    readonly roleMenuItems = viewChild(RoleMenuItems);

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<Role>[] = [
        {
            field: 'code',
            header: 'Código',
        },
        {
            field: 'name',
            header: 'Nombre',
        },
        {
            field: 'description',
            header: 'Descripción',
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

    readonly gridConfig = computed<DataGridConfig<Role>>(() => ({
        dataKey: 'role_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('ROLE_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay roles registrados',
    }));

    readonly actions = computed<DataGridAction<Role>[]>(() => {
        const actions: DataGridAction<Role>[] = [];

        if (this.authService.hasPermission('ROLE_UPDATE')) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });
        }

        if (this.authService.hasPermission('ROLE_PERMISSION_SYNC')) {
            actions.push({
                id: 'permissions',
                label: 'Asignar permisos',
                icon: 'pi pi-key',
                severity: 'secondary',
            });
        }

        if (this.authService.hasPermission('ROLE_MENU_SYNC')) {
            actions.push({
                id: 'menu-items',
                label: 'Asignar opciones de menú',
                icon: 'pi pi-list',
                severity: 'secondary',
            });
        }

        if (this.authService.hasPermission('ROLE_DELETE')) {
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
        this.loadRoles();
    }

    loadRoles(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.rolesService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.roles.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error('Error al cargar', 'No fue posible obtener los roles.');
                },
            });
    }

    onQueryChange(query: DataGridQuery): void {
        this.loadRoles({
            page: query.page,
            limit: query.limit,
        });
    }

    refresh(): void {
        this.loadRoles();
    }

    onCreate(): void {
        this.selectedRole.set(null);
        this.dialogVisible.set(true);

        this.roleForm()?.resetForm(null);
    }

    onAction(event: DataGridActionEvent<Role>): void {
        switch (event.action) {
            case 'edit':
                this.onEdit(event.row);
                break;

            case 'permissions':
                this.onPermissions(event.row);
                break;

            case 'menu-items':
                this.onMenuItems(event.row);
                break;

            case 'delete':
                this.onDelete(event.row);
                break;
        }
    }

    private onEdit(role: Role): void {
        this.selectedRole.set(role);
        this.dialogVisible.set(true);

        this.roleForm()?.resetForm(role);
    }

    private onPermissions(role: Role): void {
        this.permissionsRole.set(role);
        this.permissionsDialogVisible.set(true);
    }

    private onMenuItems(role: Role): void {
        this.menuItemsRole.set(role);
        this.menuItemsDialogVisible.set(true);
    }

    private onDelete(role: Role): void {
        this.confirmDialog.delete(`¿Está seguro de que desea eliminar el rol "${role.name}"?`, () =>
            this.deleteRole(role.role_id),
        );
    }

    private deleteRole(roleId: number): void {
        this.rolesService
            .delete(roleId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success('Rol eliminado', 'El rol se eliminó correctamente.');

                    this.loadRoles();
                },
                error: () => {
                    this.toast.error('Error al eliminar', 'No fue posible eliminar el rol.');
                },
            });
    }

    saveRole(): void {
        if (this.saving()) {
            return;
        }

        const payload = this.roleForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedRole();

        this.saving.set(true);

        const request$ = selected
            ? this.rolesService.update(selected.role_id, payload)
            : this.rolesService.create(payload);

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
                            ? 'El rol se actualizó correctamente.'
                            : 'El rol se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedRole.set(null);

                    this.loadRoles();
                },
                error: (error) => {
                    const applied = this.roleForm()?.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error('Error al guardar', 'No fue posible guardar el rol.');
                },
            });
    }

    saveRolePermissions(): void {
        this.rolePermissions()?.save();
    }

    onPermissionsSaved(): void {
        this.permissionsDialogVisible.set(false);
        this.permissionsRole.set(null);
    }

    saveRoleMenuItems(): void {
        this.roleMenuItems()?.save();
    }

    onMenuItemsSaved(): void {
        this.menuItemsDialogVisible.set(false);
        this.menuItemsRole.set(null);
    }
}
