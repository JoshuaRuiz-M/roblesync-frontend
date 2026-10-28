import type { Routes } from '@angular/router';

import { AuthLayout } from '../../layout/auth-layout/auth-layout';
import { guestGuard } from '../../core/auth/guards/guest.guard';

export const AUTH_ROUTES: Routes = [
    {
        path: '',
        component: AuthLayout,
        canActivate: [guestGuard],
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'login',
            },
            {
                path: 'login',
                title: 'Iniciar sesión',
                loadComponent: () => import('./pages/login/login').then((m) => m.Login),
            },
            {
                path: '**',
                title: 'Página no encontrada',
                loadComponent: () =>
                    import('../not-found/pages/not-found/not-found').then((m) => m.NotFound),
            },
        ],
    },
];
