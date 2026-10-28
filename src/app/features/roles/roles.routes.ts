import type { Routes } from '@angular/router';

export const ROLES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/roles/roles').then((m) => m.Roles),
    },
];
