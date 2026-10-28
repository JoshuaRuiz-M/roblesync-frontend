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

import { UsersService } from '../../services/users.service';
import type { CreateUser, User } from '../../models/user.model';

import { DataGrid } from '../../../../shared/components/data-grid/components/data-grid/data-grid';
import { UserForm } from '../../components/user-form/user-form';
import { FormDialog } from '../../../../shared/components/form-dialog/form-dialog';
import { UserPassword } from '../../components/user-password/user-password';
import { UserRoles } from '../../components/user-roles/user-roles';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
    selector: 'app-users',
    imports: [DataGrid, FormDialog, UserForm, UserPassword, UserRoles],
    templateUrl: './users.html',
    styleUrl: './users.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Users {
    private readonly authService = inject(AuthService);
    private readonly usersService = inject(UsersService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    readonly users = signal<User[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    readonly dialogVisible = signal(false);
    readonly selectedUser = signal<User | null>(null);

    readonly userRoles = viewChild(UserRoles);
    readonly rolesDialogVisible = signal(false);
    readonly rolesUser = signal<User | null>(null);

    readonly userPassword = viewChild(UserPassword);
    readonly passwordDialogVisible = signal(false);
    readonly passwordUser = signal<User | null>(null);

    readonly saving = signal(false);
    readonly userForm = viewChild(UserForm);
    readonly dialogTitle = computed(() =>
        this.selectedUser() ? 'Editar usuario' : 'Nuevo usuario',
    );

    readonly pagination = signal<PaginationMeta>({
        page: PAGINATION_DEFAULTS.PAGE,
        limit: PAGINATION_DEFAULTS.LIMIT,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    readonly columns: DataGridColumn<User>[] = [
        {
            field: 'username',
            header: 'Usuario',
        },
        {
            field: 'first_name',
            header: 'Nombre',
        },
        {
            field: 'last_name',
            header: 'Apellido',
        },
        {
            field: 'email',
            header: 'Correo electrónico',
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

    readonly gridConfig = computed<DataGridConfig<User>>(() => ({
        dataKey: 'user_id',
        paginator: true,
        globalSearch: false,
        sortable: false,
        showCreate: this.authService.hasPermission('USER_CREATE'),
        showRefresh: true,
        stripedRows: true,
        emptyMessage: 'No hay usuarios registrados',
    }));

    readonly actions = computed<DataGridAction<User>[]>(() => {
        const actions: DataGridAction<User>[] = [];

        if (this.authService.hasPermission('USER_UPDATE')) {
            actions.push({
                id: 'edit',
                label: 'Editar',
                icon: 'pi pi-pencil',
                severity: 'primary',
            });

            actions.push({
                id: 'password',
                label: 'Cambiar contraseña',
                icon: 'pi pi-key',
                severity: 'secondary',
            });
        }

        if (this.authService.hasPermission('USER_ROLE_SYNC')) {
            actions.push({
                id: 'roles',
                label: 'Asignar roles',
                icon: 'pi pi-shield',
                severity: 'secondary',
            });
        }

        if (this.authService.hasPermission('USER_DELETE')) {
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
    }

    loadUsers(query?: PaginationParams): void {
        const params = query ?? {
            page: this.pagination().page,
            limit: this.pagination().limit,
        };

        this.loading.set(true);
        this.error.set(false);

        this.usersService
            .getAll(params)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: (response) => {
                    this.users.set(response.data);
                    this.pagination.set(response.meta);
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error('Error al cargar', 'No fue posible obtener los usuarios.');
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

    onAction(event: DataGridActionEvent<User>): void {
        switch (event.action) {
            case 'edit':
                this.onEdit(event.row);
                break;

            case 'roles':
                this.onRoles(event.row);
                break;

            case 'password':
                this.onPassword(event.row);
                break;

            case 'delete':
                this.onDelete(event.row);
                break;
        }
    }

    onCreate(): void {
        this.selectedUser.set(null);
        this.dialogVisible.set(true);

        this.userForm()?.resetForm(null);
    }

    private onEdit(user: User): void {
        this.selectedUser.set(user);
        this.dialogVisible.set(true);

        this.userForm()?.resetForm(user);
    }

    private onRoles(user: User): void {
        this.rolesUser.set(user);
        this.rolesDialogVisible.set(true);
    }

    private onPassword(user: User): void {
        this.passwordUser.set(user);
        this.passwordDialogVisible.set(true);

        this.userPassword()?.resetForm();
    }

    private onDelete(user: User): void {
        this.confirmDialog.delete(
            `¿Está seguro de que desea eliminar al usuario "${user.username}"?`,
            () => this.deleteUser(user.user_id),
        );
    }

    private deleteUser(userId: number): void {
        this.usersService
            .delete(userId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toast.success('Usuario eliminado', 'El usuario se eliminó correctamente.');

                    this.loadUsers();
                },
                error: () => {
                    this.toast.error('Error al eliminar', 'No fue posible eliminar el usuario.');
                },
            });
    }

    saveUser(): void {
        if (this.saving()) {
            return;
        }

        const payload = this.userForm()?.getPayload();

        if (!payload) {
            return;
        }

        const selected = this.selectedUser();

        this.saving.set(true);

        const request$ = selected
            ? this.usersService.update(selected.user_id, payload)
            : this.usersService.create(payload as CreateUser);

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
                            ? 'El usuario se actualizó correctamente.'
                            : 'El usuario se creó correctamente.',
                    );

                    this.dialogVisible.set(false);
                    this.selectedUser.set(null);

                    this.loadUsers();
                },
                error: (error) => {
                    const applied = this.userForm()?.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error('Error al guardar', 'No fue posible guardar el usuario.');
                },
            });
    }

    saveUserPassword(): void {
        this.userPassword()?.save();
    }

    onPasswordSaved(): void {
        this.passwordDialogVisible.set(false);
        this.passwordUser.set(null);
    }

    saveUserRoles(): void {
        this.userRoles()?.save();
    }

    onRolesSaved(): void {
        this.rolesDialogVisible.set(false);
        this.rolesUser.set(null);
    }
}
