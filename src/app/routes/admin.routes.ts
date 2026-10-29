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
                    import('../features/brands/brands.routes').then((m) => m.BRANDS_ROUTES),
            },
            {
                path: 'categories',
                canActivate: [menuGuard],
                loadChildren: () =>
                    import('../features/categories/categories.routes').then(
                        (m) => m.CATEGORIES_ROUTES,
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
