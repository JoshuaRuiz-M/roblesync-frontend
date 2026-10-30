import { Routes } from '@angular/router';

export const SUPPLIER_INVOICES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/supplier-invoices/supplier-invoices').then((m) => m.SupplierInvoices),
    },
];
