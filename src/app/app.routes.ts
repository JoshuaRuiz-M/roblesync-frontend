import type { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
    },
    {
        path: 'login',
        pathMatch: 'full',
        redirectTo: 'auth/login',
    },
    {
        path: '',
        loadChildren: () => import('./routes/admin.routes').then((m) => m.ADMIN_ROUTES),
    },
];
