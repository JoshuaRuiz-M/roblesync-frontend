import { Routes } from '@angular/router';

export const PRODUCT_BATCHES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/product-batches/product-batches').then((m) => m.ProductBatches),
    },
];
