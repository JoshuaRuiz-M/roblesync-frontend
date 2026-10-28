import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ToastService } from '../../services/toast.service';
import { SKIP_GLOBAL_ERROR_TOAST } from '../context/http-error.context';
import { getProblemDetails } from '../utils/problem-details.util';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
    const toastService = inject(ToastService);

    const apiUrl = environment.apiUrl.replace(/\/$/, '');
    const isApiRequest = req.url === apiUrl || req.url.startsWith(`${apiUrl}/`);

    return next(req).pipe(
        catchError((error: unknown) => {
            if (!(error instanceof HttpErrorResponse)) {
                return throwError(() => error);
            }

            if (!isApiRequest || req.context.get(SKIP_GLOBAL_ERROR_TOAST)) {
                return throwError(() => error);
            }

            const problem = getProblemDetails(error);

            switch (error.status) {
                case 0:
                    toastService.error(
                        'Error de conexión',
                        'No fue posible conectar con el servidor.',
                    );
                    break;

                case 403:
                    toastService.warn(
                        'Acceso denegado',
                        problem?.detail ?? 'No tiene permisos para realizar esta operación.',
                    );
                    break;

                case 429:
                    toastService.warn(
                        'Demasiadas solicitudes',
                        problem?.detail ?? 'Espere un momento antes de intentarlo nuevamente.',
                    );
                    break;

                default:
                    if (error.status >= 500 && error.status <= 599) {
                        toastService.error(
                            'Error del servidor',
                            'Ocurrió un problema al procesar la solicitud.',
                        );
                    }
                    break;
            }

            return throwError(() => error);
        }),
    );
};
