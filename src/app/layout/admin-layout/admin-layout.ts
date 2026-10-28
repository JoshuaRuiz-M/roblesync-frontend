import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';

import { Sidebar } from '../components/sidebar/sidebar';
import { Navbar } from '../components/navbar/navbar';
import { MenuService } from '../../core/auth/services/menu.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-admin-layout',
    imports: [RouterOutlet, DrawerModule, Sidebar, Navbar, ConfirmDialogModule],
    templateUrl: './admin-layout.html',
    styleUrl: './admin-layout.scss',
})
export class AdminLayout implements OnInit {
    private readonly menuService = inject(MenuService);
    private readonly ToastService = inject(ToastService);

    readonly collapsed = signal(false);
    readonly mobileOpen = signal(false);

    readonly menuItems = this.menuService.menu;
    readonly menuLoading = this.menuService.loading;

    ngOnInit(): void {
        this.menuService.loadMenu().subscribe({
            error: (error: unknown) => {
                this.ToastService.error(`No fue posible cargar el menú del usuario. ${error}`);
            },
        });
    }

    toggleSidebar(): void {
        this.collapsed.update((value) => !value);
    }

    toggleMobileSidebar(): void {
        this.mobileOpen.update((value) => !value);
    }

    closeMobileSidebar(): void {
        this.mobileOpen.set(false);
    }
}
