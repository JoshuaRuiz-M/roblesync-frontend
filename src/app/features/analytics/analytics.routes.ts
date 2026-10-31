import { Routes } from '@angular/router';

export const ANALYTICS_ROUTES: Routes = [
    {
        path: '',
        redirectTo: 'kardex',
        pathMatch: 'full',
    },
    {
        path: 'kardex',
        loadComponent: () => import('./pages/kardex/kardex').then((m) => m.Kardex),
    },
];
