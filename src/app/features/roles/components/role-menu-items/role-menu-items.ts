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
import { CheckboxModule } from 'primeng/checkbox';
import { finalize, forkJoin, map, of, switchMap } from 'rxjs';

import { MenuItemsService } from '../../../menu-items/services/menu-items.service';
import type { MenuItem } from '../../../menu-items/models/menu-item.model';

import { RolesService } from '../../services/roles.service';
import type { Role } from '../../models/role.model';

import { ToastService } from '../../../../core/services/toast.service';
import { NgTemplateOutlet } from '@angular/common';

interface MenuItemGroup {
    item: MenuItem;
    children: MenuItemGroup[];
}

@Component({
    selector: 'app-role-menu-items',
    imports: [FormsModule, CheckboxModule, NgTemplateOutlet],
    templateUrl: './role-menu-items.html',
    styleUrl: './role-menu-items.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleMenuItems implements OnInit {
    private readonly menuItemsService = inject(MenuItemsService);
    private readonly rolesService = inject(RolesService);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly role = input.required<Role>();
    readonly saved = output<void>();

    readonly menuItems = signal<MenuItem[]>([]);
    readonly selectedIds = signal<number[]>([]);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly error = signal(false);

    readonly menuTree = computed(() => this.buildTree(this.menuItems()));

    ngOnInit(): void {
        this.loadMenuItems();
    }

    loadMenuItems(): void {
        this.loading.set(true);
        this.error.set(false);

        const available$ = this.menuItemsService.getAll({ page: 1, limit: 100 }).pipe(
            switchMap((first) => {
                if (first.meta.totalPages <= 1) {
                    return of(first.data);
                }

                const requests = Array.from({ length: first.meta.totalPages - 1 }, (_, index) =>
                    this.menuItemsService.getAll({
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

        const assigned$ = this.rolesService.getMenuItems(this.role().role_id);

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
                    this.menuItems.set(available);

                    this.selectedIds.set(assigned.data.map((item) => item.menu_item_id));
                },
                error: () => {
                    this.error.set(true);

                    this.toast.error(
                        'Error al cargar',
                        'No fue posible obtener las opciones de menú.',
                    );
                },
            });
    }

    isSelected(menuItemId: number): boolean {
        return this.selectedIds().includes(menuItemId);
    }

    toggleMenuItem(menuItemId: number, checked: boolean): void {
        this.selectedIds.update((ids) =>
            checked ? [...new Set([...ids, menuItemId])] : ids.filter((id) => id !== menuItemId),
        );
    }

    save(): void {
        if (this.loading() || this.error() || this.saving()) {
            return;
        }

        this.saving.set(true);

        this.rolesService
            .syncMenuItems(this.role().role_id, {
                menu_item_ids: this.selectedIds(),
            })
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.saving.set(false)),
            )
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Menús actualizados',
                        'Las opciones de menú se asignaron correctamente.',
                    );

                    this.saved.emit();
                },
                error: () => {
                    this.toast.error(
                        'Error al guardar',
                        'No fue posible actualizar las opciones de menú.',
                    );
                },
            });
    }

    private buildTree(items: MenuItem[]): MenuItemGroup[] {
        const nodes = new Map<number, MenuItemGroup>();

        for (const item of items) {
            nodes.set(item.menu_item_id, {
                item,
                children: [],
            });
        }

        const roots: MenuItemGroup[] = [];

        for (const node of nodes.values()) {
            const parent =
                node.item.parent_id === null ? undefined : nodes.get(node.item.parent_id);

            if (parent) {
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        }

        const sortNodes = (groups: MenuItemGroup[]): void => {
            groups.sort((a, b) => a.item.sort_order - b.item.sort_order);

            for (const group of groups) {
                sortNodes(group.children);
            }
        };

        sortNodes(roots);

        return roots;
    }
}
