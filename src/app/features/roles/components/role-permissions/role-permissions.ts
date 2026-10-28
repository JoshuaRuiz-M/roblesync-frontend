import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    OnInit,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CheckboxModule } from 'primeng/checkbox';
import { forkJoin, map, of, switchMap, finalize } from 'rxjs';

import { PermissionsService } from '../../../permissions/services/permissions.service';
import type { Permission } from '../../../permissions/models/permission.model';

import { RolesService } from '../../services/roles.service';
import type { Role } from '../../models/role.model';

import { ToastService } from '../../../../core/services/toast.service';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@Component({
    selector: 'app-role-permissions',
    imports: [FormsModule, CheckboxModule, InputTextModule],
    templateUrl: './role-permissions.html',
    styleUrl: './role-permissions.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolePermissions implements OnInit {
    private readonly permissionsService = inject(PermissionsService);
    private readonly rolesService = inject(RolesService);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly role = input.required<Role>();
    readonly saved = output<void>();

    readonly permissions = signal<Permission[]>([]);
    readonly selectedIds = signal<number[]>([]);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly error = signal(false);

    readonly searchTerm = signal('');

    readonly filteredPermissions = computed(() => {
        const search = this.searchTerm().trim().toLowerCase();

        if (!search) {
            return this.permissions();
        }

        return this.permissions().filter(
            (permission) =>
                permission.name.toLowerCase().includes(search) ||
                permission.code.toLowerCase().includes(search),
        );
    });

    ngOnInit(): void {
        this.loadPermissions();
    }

    loadPermissions(): void {
        this.loading.set(true);
        this.error.set(false);

        const available$ = this.permissionsService.getAll({ page: 1, limit: 100 }).pipe(
            switchMap((first) => {
                const totalPages = first.meta.totalPages;

                if (totalPages <= 1) {
                    return of(first.data);
                }

                const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
                    this.permissionsService.getAll({
                        page: index + 2,
                        limit: 100,
                    }),
                );

                return forkJoin(requests).pipe(
                    map((remaining) => [
                        ...first.data,
                        ...remaining.flatMap((response) => response.data),
                    ]),
                );
            }),
        );

        const assigned$ = this.rolesService.getPermissions(this.role().role_id);

        forkJoin({
            available: available$,
            assigned: assigned$,
        })
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: ({ available, assigned }) => {
                    this.permissions.set(available);
                    this.selectedIds.set(assigned.data.map((item) => item.permission_id));
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error('Error al cargar', 'No fue posible obtener los permisos.');
                },
            });
    }

    isSelected(permissionId: number): boolean {
        return this.selectedIds().includes(permissionId);
    }

    togglePermission(permissionId: number, checked: boolean): void {
        this.selectedIds.update((ids) =>
            checked
                ? [...new Set([...ids, permissionId])]
                : ids.filter((id) => id !== permissionId),
        );
    }

    save(): void {
        if (this.loading() || this.error() || this.saving()) {
            return;
        }

        this.saving.set(true);

        this.rolesService
            .syncPermissions(this.role().role_id, {
                permission_ids: this.selectedIds(),
            })
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.saving.set(false)),
            )
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Permisos actualizados',
                        'Los permisos del rol se guardaron correctamente.',
                    );

                    this.saved.emit();
                },
                error: () => {
                    this.toast.error(
                        'Error al guardar',
                        'No fue posible actualizar los permisos del rol.',
                    );
                },
            });
    }
}
