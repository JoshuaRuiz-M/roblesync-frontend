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

import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { forkJoin, finalize, switchMap, map, of } from 'rxjs';

import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';

import { RolesService } from '../../../roles/services/roles.service';
import { UsersService } from '../../services/users.service';
import { ToastService } from '../../../../core/services/toast.service';

import type { Role } from '../../../roles/models/role.model';
import type { User } from '../../models/user.model';

@Component({
    selector: 'app-user-roles',
    imports: [FormsModule, CheckboxModule, InputTextModule],
    templateUrl: './user-roles.html',
    styleUrl: './user-roles.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserRoles implements OnInit {
    private readonly rolesService = inject(RolesService);
    private readonly usersService = inject(UsersService);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly user = input.required<User>();
    readonly saved = output<void>();

    readonly roles = signal<Role[]>([]);
    readonly selectedIds = signal<number[]>([]);

    readonly searchTerm = signal('');

    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly error = signal(false);

    readonly filteredRoles = computed(() => {
        const search = this.searchTerm().trim().toLowerCase();

        if (!search) {
            return this.roles();
        }

        return this.roles().filter(
            (role) =>
                role.name.toLowerCase().includes(search) ||
                role.code.toLowerCase().includes(search),
        );
    });

    ngOnInit(): void {
        this.loadRoles();
    }

    loadRoles(): void {
        this.loading.set(true);
        this.error.set(false);

        const available$ = this.rolesService.getAll({ page: 1, limit: 100 }).pipe(
            switchMap((first) => {
                const totalPages = first.meta.totalPages;

                if (totalPages <= 1) {
                    return of(first.data);
                }

                const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
                    this.rolesService.getAll({
                        page: index + 2,
                        limit: 100,
                    }),
                );

                return forkJoin(requests).pipe(
                    map((responses) => [
                        ...first.data,
                        ...responses.flatMap((response) => response.data),
                    ]),
                );
            }),
        );

        forkJoin({
            available: available$,
            assigned: this.usersService.getRoles(this.user().user_id),
        })
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.loading.set(false)),
            )
            .subscribe({
                next: ({ available, assigned }) => {
                    this.roles.set(available);

                    this.selectedIds.set(assigned.data.map((role) => role.role_id));
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error(
                        'Error al cargar',
                        'No fue posible obtener los roles del usuario.',
                    );
                },
            });
    }

    isSelected(roleId: number): boolean {
        return this.selectedIds().includes(roleId);
    }

    toggleRole(roleId: number, checked: boolean): void {
        this.selectedIds.update((current) => {
            if (checked) {
                return [...new Set([...current, roleId])];
            }

            return current.filter((id) => id !== roleId);
        });
    }

    save(): void {
        if (this.loading() || this.error() || this.saving()) {
            return;
        }

        this.saving.set(true);

        this.usersService
            .syncRoles(this.user().user_id, {
                role_ids: this.selectedIds(),
            })
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.saving.set(false)),
            )
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Roles actualizados',
                        'Los roles del usuario se actualizaron correctamente.',
                    );

                    this.saved.emit();
                },
                error: (error) => {
                    if (error.status === 400) {
                        this.toast.warn(
                            'Roles inválidos',
                            'Uno o más roles seleccionados no existen.',
                        );
                        return;
                    }

                    this.toast.error(
                        'Error al guardar',
                        'No fue posible actualizar los roles del usuario.',
                    );
                },
            });
    }
}
