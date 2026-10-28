import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordComplexityValidator: ValidatorFn = (
    control: AbstractControl,
): ValidationErrors | null => {
    const password = control.value as string;

    if (!password) {
        return null;
    }

    if (!/[A-Z]/.test(password)) {
        return { uppercase: true };
    }

    if (!/[a-z]/.test(password)) {
        return { lowercase: true };
    }

    if (!/[0-9]/.test(password)) {
        return { number: true };
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
        return { specialCharacter: true };
    }

    return null;
};
