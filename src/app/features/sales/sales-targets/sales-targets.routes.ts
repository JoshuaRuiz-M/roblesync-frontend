import { Routes } from '@angular/router';

export const SALES_TARGETS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/sales-targets/sales-targets').then((m) => m.SalesTargetsPage),
    },
];
