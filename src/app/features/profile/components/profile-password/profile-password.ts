import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';

import { PasswordModule } from 'primeng/password';

import type { ChangePasswordRequest } from '../../../../core/auth/models/change-password-request.model';
import { applyServerValidationErrors } from '../../../../core/http/utils/form-validation.util';
import { passwordComplexityValidator } from '../../../../shared/validators/password.validator';
import { getProblemDetails } from '../../../../core/http/utils/problem-details.util';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-profile-password',
    imports: [ReactiveFormsModule, PasswordModule],
    templateUrl: './profile-password.html',
    styleUrl: './profile-password.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePassword {
    private readonly fb = inject(FormBuilder);

    readonly errorMessage = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group(
        {
            current_password: ['', [Validators.required]],
            new_password: [
                '',
                [
                    Validators.required,
                    Validators.minLength(12),
                    Validators.maxLength(128),
                    passwordComplexityValidator,
                ],
            ],
            confirmPassword: ['', [Validators.required]],
        },
        {
            validators: [this.passwordMatchValidator],
        },
    );

    readonly validationMessages = {
        current_password: {
            required: 'La contraseña actual es obligatoria.',
        },
        new_password: {
            required: 'La nueva contraseña es obligatoria.',
            minlength: 'La contraseña debe tener al menos 12 caracteres.',
            maxlength: 'La contraseña no puede superar los 128 caracteres.',
            uppercase: 'La contraseña debe contener al menos una letra mayúscula.',
            lowercase: 'La contraseña debe contener al menos una letra minúscula.',
            number: 'La contraseña debe contener al menos un número.',
            specialCharacter: 'La contraseña debe contener al menos un carácter especial.',
        },
        confirmPassword: {
            required: 'Debe confirmar la nueva contraseña.',
            mismatch: 'Las contraseñas no coinciden.',
        },
    };

    private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
        const password = control.get('new_password')?.value;
        const confirmation = control.get('confirmPassword')?.value;

        if (!confirmation || password === confirmation) {
            return null;
        }

        return { mismatch: true };
    }

    getFieldError(field: keyof typeof this.form.controls): string | null {
        const control = this.form.controls[field];

        if (!control.dirty && !control.touched) {
            return null;
        }

        if (control.hasError('server')) {
            return control.getError('server') as string;
        }

        const messages = this.validationMessages[field];

        for (const [errorKey, message] of Object.entries(messages)) {
            if (control.hasError(errorKey)) {
                return message;
            }

            if (
                field === 'confirmPassword' &&
                errorKey === 'mismatch' &&
                this.form.hasError('mismatch')
            ) {
                return message;
            }
        }

        return null;
    }

    getPayload(): ChangePasswordRequest | null {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const { current_password, new_password } = this.form.getRawValue();

        return {
            current_password,
            new_password,
        };
    }

    applyValidationErrors(error: unknown): boolean {
        this.errorMessage.set(null);

        if (applyServerValidationErrors(error, this.form)) {
            return true;
        }

        if (!(error instanceof HttpErrorResponse)) {
            return false;
        }

        if (error.status !== 400 && error.status !== 409) {
            return false;
        }

        const problem = getProblemDetails(error);

        this.errorMessage.set(problem?.detail || 'No fue posible actualizar la contraseña.');

        return true;
    }

    resetForm(): void {
        this.form.reset();
        this.errorMessage.set(null);
    }
}
