import { Routes } from '@angular/router';

export const WAREHOUSES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/warehouse/warehouse').then((m) => m.Warehouses),
    },
];
