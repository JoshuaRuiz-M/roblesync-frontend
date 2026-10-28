import { HttpErrorResponse } from '@angular/common/http';

import type { ProblemDetails } from '../models/problem-details.model';

export function getProblemDetails(error: HttpErrorResponse): ProblemDetails | null {
    const body: unknown = error.error;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }

    const problem = body as Partial<ProblemDetails>;

    if (
        typeof problem.requestId !== 'string' ||
        typeof problem.type !== 'string' ||
        typeof problem.title !== 'string' ||
        typeof problem.status !== 'number' ||
        typeof problem.detail !== 'string' ||
        typeof problem.instance !== 'string'
    ) {
        return null;
    }

    return problem as ProblemDetails;
}
