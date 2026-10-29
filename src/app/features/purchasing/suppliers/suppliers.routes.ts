import { Routes } from '@angular/router';

export const SUPPLIERS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/suppliers/suppliers').then((m) => m.Suppliers),
    },
];
