import { HttpErrorResponse } from '@angular/common/http';
import { FormGroup } from '@angular/forms';

import type { ProblemDetails } from '../models/problem-details.model';

export function applyServerValidationErrors(error: unknown, form: FormGroup): boolean {
    if (!(error instanceof HttpErrorResponse)) {
        return false;
    }

    const problem = error.error as Partial<ProblemDetails> | null;

    if (!problem || typeof problem !== 'object' || !Array.isArray(problem.errors)) {
        return false;
    }

    let applied = false;

    for (const validationError of problem.errors) {
        if (
            !validationError ||
            typeof validationError.field !== 'string' ||
            typeof validationError.message !== 'string'
        ) {
            continue;
        }

        const control = form.get(validationError.field);

        if (!control) {
            continue;
        }

        control.setErrors({
            ...control.errors,
            server: validationError.message,
        });

        control.markAsTouched();
        applied = true;
    }

    return applied;
}
