import { AbstractControl, FormGroup } from '@angular/forms';

type ValidationMessages = Record<string, Record<string, string>>;

export function getFormFieldError<T extends FormGroup>(
    form: T,
    field: keyof T['controls'] & string,
    validationMessages: ValidationMessages,
): string | null {
    const control: AbstractControl = form.controls[field];

    if (!control.invalid || (!control.dirty && !control.touched)) {
        return null;
    }

    if (control.hasError('server')) {
        return control.getError('server') as string;
    }

    const messages = validationMessages[field];

    if (!messages) {
        return null;
    }

    for (const [errorKey, message] of Object.entries(messages)) {
        if (control.hasError(errorKey)) {
            return message;
        }
    }

    return null;
}
