import { Routes } from '@angular/router';

export const PRICE_LISTS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/price-lists/price-lists').then((m) => m.PriceLists),
    },
];
