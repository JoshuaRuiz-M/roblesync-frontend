import type { Routes } from '@angular/router';

export const SALES_INVOICES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/sales-invoices/sales-invoices').then((m) => m.SalesInvoices),
    },
];
