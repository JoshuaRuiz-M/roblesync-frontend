import { Routes } from '@angular/router';

export const CUSTOMERS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/customers/customers').then((m) => m.Customers),
    },
];
