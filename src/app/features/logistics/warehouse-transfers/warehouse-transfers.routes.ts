import { Routes } from '@angular/router';

export const WAREHOUSE_TRANSFERS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/warehouse-transfers/warehouse-transfers').then(
                (m) => m.WarehouseTransfers,
            ),
    },
];
