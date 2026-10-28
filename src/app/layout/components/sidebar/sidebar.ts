import {
    Component,
    computed,
    effect,
    input,
    output,
    signal,
    ViewChild,
    untracked,
    inject,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { NgTemplateOutlet } from '@angular/common';
import { Popover, PopoverModule } from 'primeng/popover';

import type { UserMenuItem } from '../../../core/auth/models/user-menu-item.model';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-sidebar',
    imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, TooltipModule, PopoverModule],
    templateUrl: './sidebar.html',
    styleUrl: './sidebar.scss',
})
export class Sidebar {
    readonly collapsed = input(false);
    readonly menuItems = input<UserMenuItem[]>([]);
    readonly navigate = output<void>();

    @ViewChild('submenuPopover')
    submenuPopover?: Popover;

    readonly navigationItems = computed<UserMenuItem[]>(() => [
        {
            id: -1,
            label: 'Inicio',
            icon: 'pi pi-home',
            routerLink: '/home',
        },
        ...this.menuItems(),
    ]);

    readonly floatingItems = signal<UserMenuItem[]>([]);
    readonly floatingTitle = signal('');

    private readonly router: Router = inject(Router);

    readonly expandedItems = signal<Set<number>>(new Set());

    readonly currentUrl;
    readonly appName = environment.appName;

    constructor() {
        this.currentUrl = toSignal(
            this.router.events.pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                map((event) => event.urlAfterRedirects),
                startWith(this.router.url),
            ),
            { initialValue: this.router.url },
        );

        effect(() => {
            const parentIds = this.activeParentIds();

            this.expandedItems.update((current) => {
                const updated = new Set(current);

                for (const id of parentIds) {
                    updated.add(id);
                }

                return updated;
            });
        });

        effect(() => {
            const isCollapsed = this.collapsed();

            if (!isCollapsed) {
                untracked(() => {
                    this.closeFloatingMenu();
                });
            }
        });
    }

    readonly activeParentIds = computed(() => {
        const active = new Set<number>();
        const url = this.currentUrl().split(/[?#]/)[0];

        const visit = (item: UserMenuItem): boolean => {
            const matches = item.routerLink === url;
            const childMatches = item.items?.some((child) => visit(child)) ?? false;

            if (childMatches) {
                active.add(item.id);
            }

            return matches || childMatches;
        };

        this.menuItems().forEach(visit);

        return active;
    });

    isExpanded(id: number): boolean {
        return this.expandedItems().has(id);
    }

    toggleItem(id: number): void {
        this.expandedItems.update((current) => {
            const updated = new Set(current);

            if (updated.has(id)) {
                updated.delete(id);
            } else {
                updated.add(id);
            }

            return updated;
        });
    }

    onNavigate(): void {
        this.closeFloatingMenu();
        this.navigate.emit();
    }

    openFloatingMenu(event: Event, item: UserMenuItem): void {
        if (!item.items?.length) {
            return;
        }

        this.floatingItems.set(item.items);
        this.floatingTitle.set(item.label);

        this.submenuPopover?.show(event);
    }

    closeFloatingMenu(): void {
        this.submenuPopover?.hide();
    }
}
