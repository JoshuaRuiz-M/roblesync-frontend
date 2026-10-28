import { Component, inject, input, output, signal, ViewChild } from '@angular/core';
import { Menu, MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuItem } from 'primeng/api';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-navbar',
    imports: [MenuModule, ButtonModule, AvatarModule],
    templateUrl: './navbar.html',
    styleUrl: './navbar.scss',
})
export class Navbar {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);

    readonly collapsed = input(false);

    readonly toggleSidebar = output<void>();
    readonly toggleMobileSidebar = output<void>();

    readonly currentUser = this.authService.user;
    readonly fullName = this.authService.fullName;

    readonly appName = environment.appName;

    @ViewChild('userMenu') userMenu?: Menu;

    readonly userMenuItems = signal<MenuItem[]>([
        {
            label: 'Mi perfil',
            icon: 'pi pi-user',
            routerLink: '/profile',
        },
        {
            separator: true,
        },
        {
            label: 'Cerrar sesión',
            icon: 'pi pi-sign-out',
            command: () => this.logout(),
        },
    ]);

    async logout(): Promise<void> {
        this.authService.logout();

        const navigated = await this.router.navigateByUrl('/auth/login', {
            replaceUrl: true,
        });

        if (navigated) {
            this.toast.success('Sesión finalizada', 'Has cerrado sesión correctamente.');
        }
    }
}
