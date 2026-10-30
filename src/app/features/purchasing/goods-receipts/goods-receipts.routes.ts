import { Routes } from '@angular/router';

export const GOODS_RECEIPTS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/goods-receipts/goods-receipts').then((m) => m.GoodsReceipts),
    },
];
