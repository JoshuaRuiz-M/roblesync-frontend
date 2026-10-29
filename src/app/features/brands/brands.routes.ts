import { Routes } from '@angular/router';

export const BRANDS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/brands/brands').then((m) => m.Brands),
    },
];
