import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const apiUrl = environment.apiUrl.replace(/\/$/, '');

    const isApiRequest = req.url === apiUrl || req.url.startsWith(`${apiUrl}/`);

    const isLoginRequest = req.url === `${apiUrl}/auth/login`;

    return next(req).pipe(
        catchError((error: unknown) => {
            if (
                error instanceof HttpErrorResponse &&
                error.status === 401 &&
                isApiRequest &&
                !isLoginRequest
            ) {
                const hasSession = authService.user() !== null;

                authService.logout();

                if (hasSession && !router.url.startsWith('/auth/login')) {
                    void router.navigateByUrl('/auth/login', {
                        replaceUrl: true,
                    });
                }
            }

            return throwError(() => error);
        }),
    );
};
