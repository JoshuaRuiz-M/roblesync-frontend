import type { Routes } from '@angular/router';

import { AdminLayout } from '../layout/admin-layout/admin-layout';
import { authGuard } from '../core/auth/guards/auth.guard';
import { menuGuard } from '../core/auth/guards/menu.guard';

export const ADMIN_ROUTES: Routes = [
    {
        path: '',
        component: AdminLayout,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'home',
            },
            {
                path: 'home',
                title: 'Inicio',
                loadComponent: () => import('../features/home/pages/home/home').then((m) => m.Home),
            },
            {
                path: 'profile',
                title: 'Mi perfil',
                loadComponent: () =>
                    import('../features/profile/pages/profile/profile').then((m) => m.Profile),
            },
            {
                path: 'menu-items',
                canActivate: [menuGuard],
                loadChildren: () =>
                    import('../features/menu-items/menu-items.routes').then(
                        (m) => m.MENU_ITEMS_ROUTES,
                    ),
            },
            {
                path: 'roles',
                canActivate: [menuGuard],
                loadChildren: () =>
                    import('../features/roles/roles.routes').then((m) => m.ROLES_ROUTES),
            },
            {
                path: 'users',
                canActivate: [menuGuard],
                loadChildren: () =>
                    import('../features/users/users.routes').then((m) => m.USERS_ROUTES),
            },
            {
                path: 'brands',
                canActivate: [menuGuard],
                loadChildren: () =>
                    import('../features/catalog/brands/brands.routes').then((m) => m.BRANDS_ROUTES),
            },
            {
                path: 'categories',
                canActivate: [menuGuard],
                loadChildren: () =>
                    import('../features/catalog/categories/categories.routes').then(
                        (m) => m.CATEGORIES_ROUTES,
                    ),
            },
            {
                path: 'units-of-measure',
                canActivate: [menuGuard],
                loadChildren: () =>
                    import('../features/catalog/units-of-mesure/units-of-mesure.routes').then(
                        (m) => m.UNITS_OF_MEASURE_ROUTES,
                    ),
            },
            {
                path: 'warehouses',
                canActivate: [menuGuard],
                loadChildren: () =>
                    import('../features/inventory/warehouse/warehouses.routes').then(
                        (m) => m.WAREHOUSES_ROUTES,
                    ),
            },
            {
                path: 'suppliers',
                canActivate: [menuGuard],
                loadChildren: () =>
                    import('../features/purchasing/suppliers/suppliers.routes').then(
                        (m) => m.SUPPLIERS_ROUTES,
                    ),
            },
            {
                path: 'product-lines',
                canActivate: [menuGuard],
                loadChildren: () =>
                    import('../features/catalog/product-lines/product-lines.routes').then(
                        (m) => m.PRODUCT_LINES_ROUTES,
                    ),
            },
            {
                path: 'products',
                canActivate: [menuGuard],
                loadChildren: () =>
                    import('../features/catalog/products/products.routes').then(
                        (m) => m.PRODUCTS_ROUTES,
                    ),
            },
            {
                path: 'purchase-orders',
                canActivate: [menuGuard],
                loadChildren: () =>
                    import('../features/purchasing/purchase-orders/purchase-orders.routes').then(
                        (m) => m.PURCHASE_ORDERS_ROUTES,
                    ),
            },
            {
                path: 'product-batches',
                canActivate: [menuGuard],
                loadChildren: () =>
                    import('../features/inventory/product-batches/product-batches.routes').then(
                        (m) => m.PRODUCT_BATCHES_ROUTES,
                    ),
            },
            {
                path: 'forbidden',
                title: 'Acceso denegado',
                loadComponent: () =>
                    import('../features/forbidden/pages/forbidden/forbidden').then(
                        (m) => m.Forbidden,
                    ),
            },
            {
                path: '**',
                title: 'Página no encontrada',
                loadComponent: () =>
                    import('../features/not-found/pages/not-found/not-found').then(
                        (m) => m.NotFound,
                    ),
            },
        ],
    },
];
