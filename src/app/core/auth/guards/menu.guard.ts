import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, defaultIfEmpty, map, of } from 'rxjs';

import { MenuService } from '../services/menu.service';

export const menuGuard: CanActivateFn = (_route, state) => {
    const menuService = inject(MenuService);
    const router = inject(Router);

    return menuService.loadMenu().pipe(
        map(() => {
            if (menuService.hasAccess(state.url)) {
                return true;
            }

            return router.createUrlTree(['/forbidden']);
        }),
        defaultIfEmpty(router.createUrlTree(['/auth/login'])),
        catchError(() => of(router.createUrlTree(['/forbidden']))),
    );
};
