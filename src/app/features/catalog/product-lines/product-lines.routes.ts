import { Routes } from '@angular/router';

export const PRODUCT_LINES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/product-lines/product-lines').then((m) => m.ProductLines),
    },
];
