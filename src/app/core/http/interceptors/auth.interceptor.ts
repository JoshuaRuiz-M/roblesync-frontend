import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const token = authService.getAccessToken();

    const apiUrl = environment.apiUrl.replace(/\/$/, '');
    const isApiRequest = req.url === apiUrl || req.url.startsWith(`${apiUrl}/`);

    if (!isApiRequest || !token) {
        return next(req);
    }

    const authenticatedRequest = req.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`,
        },
    });

    return next(authenticatedRequest);
};
