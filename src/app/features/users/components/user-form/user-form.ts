import { ChangeDetectionStrategy, Component, effect, input, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import type { User, CreateUser, UpdateUser } from '../../models/user.model';
import { applyServerValidationErrors } from '../../../../core/http/utils/form-validation.util';
import { passwordComplexityValidator } from '../../../../shared/validators/password.validator';
import { getFormFieldError } from '../../../../shared/utils/form-validation.util';

@Component({
    selector: 'app-user-form',
    imports: [ReactiveFormsModule, InputTextModule, PasswordModule, ToggleSwitchModule],
    templateUrl: './user-form.html',
    styleUrl: './user-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserForm {
    private readonly fb = inject(FormBuilder);

    readonly user = input<User | null>(null);

    readonly form = this.fb.nonNullable.group({
        username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
        first_name: ['', [Validators.required, Validators.maxLength(100)]],
        last_name: ['', [Validators.required, Validators.maxLength(100)]],
        password: [
            '',
            [
                Validators.required,
                Validators.minLength(12),
                Validators.maxLength(128),
                passwordComplexityValidator,
            ],
        ],
        is_active: [true],
    });

    readonly validationMessages = {
        username: {
            required: 'El usuario es obligatorio.',
            minlength: 'El usuario debe tener al menos 3 caracteres.',
            maxlength: 'El usuario no puede superar los 50 caracteres.',
        },
        email: {
            required: 'El correo electrónico es obligatorio.',
            email: 'Ingrese un correo electrónico válido.',
            maxlength: 'El correo electrónico no puede superar los 255 caracteres.',
        },
        first_name: {
            required: 'El nombre es obligatorio.',
            maxlength: 'El nombre no puede superar los 100 caracteres.',
        },
        last_name: {
            required: 'El apellido es obligatorio.',
            maxlength: 'El apellido no puede superar los 100 caracteres.',
        },
        password: {
            required: 'La contraseña es obligatoria.',
            minlength: 'La contraseña debe tener al menos 12 caracteres.',
            maxlength: 'La contraseña no puede superar los 128 caracteres.',
            uppercase: 'La contraseña debe contener al menos una letra mayúscula.',
            lowercase: 'La contraseña debe contener al menos una letra minúscula.',
            number: 'La contraseña debe contener al menos un número.',
            specialCharacter: 'La contraseña debe contener al menos un carácter especial.',
        },
    };

    constructor() {
        effect(() => {
            this.resetForm(this.user());
        });
    }

    getFieldError = (field: keyof typeof this.form.controls) =>
        getFormFieldError(this.form, field, this.validationMessages);

    resetForm(user: User | null): void {
        this.form.reset({
            username: user?.username ?? '',
            email: user?.email ?? '',
            first_name: user?.first_name ?? '',
            last_name: user?.last_name ?? '',
            password: '',
            is_active: user?.is_active ?? true,
        });

        const passwordControl = this.form.controls.password;

        if (user) {
            passwordControl.clearValidators();
        } else {
            passwordControl.setValidators([
                Validators.required,
                Validators.minLength(12),
                Validators.maxLength(128),
                passwordComplexityValidator,
            ]);
        }

        passwordControl.updateValueAndValidity({
            emitEvent: false,
        });
    }

    getPayload(): CreateUser | UpdateUser | null {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return null;
        }

        const value = this.form.getRawValue();

        const payload: UpdateUser = {
            username: value.username.trim(),
            email: value.email.trim(),
            first_name: value.first_name.trim(),
            last_name: value.last_name.trim(),
            is_active: value.is_active,
        };

        if (this.user()) {
            return payload;
        }

        return {
            ...payload,
            password: value.password,
        } as CreateUser;
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
