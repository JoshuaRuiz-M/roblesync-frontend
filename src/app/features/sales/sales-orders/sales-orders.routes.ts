import { Routes } from '@angular/router';

export const SALES_ORDERS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/sales-orders/sales-orders').then((m) => m.SalesOrders),
    },
];
