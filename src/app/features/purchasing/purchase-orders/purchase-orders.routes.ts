import { Routes } from '@angular/router';

export const PURCHASE_ORDERS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/purchase-orders/purchase-orders').then((m) => m.PurchaseOrders),
    },
];
