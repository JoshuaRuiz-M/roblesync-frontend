import type { Routes } from '@angular/router';

export const MENU_ITEMS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/menu-items/menu-items').then((m) => m.MenuItems),
    },
];
