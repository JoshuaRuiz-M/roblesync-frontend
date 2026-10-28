import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    input,
    output,
    signal,
} from '@angular/core';

import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { PasswordModule } from 'primeng/password';

import { UsersService } from '../../services/users.service';
import { ToastService } from '../../../../core/services/toast.service';

import type { User } from '../../models/user.model';
import { applyServerValidationErrors } from '../../../../core/http/utils/form-validation.util';
import { passwordComplexityValidator } from '../../../../shared/validators/password.validator';

@Component({
    selector: 'app-user-password',
    imports: [ReactiveFormsModule, PasswordModule],
    templateUrl: './user-password.html',
    styleUrl: './user-password.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPassword {
    private readonly fb = inject(FormBuilder);
    private readonly usersService = inject(UsersService);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly user = input.required<User>();
    readonly saved = output<void>();

    readonly saving = signal(false);

    readonly form = this.fb.nonNullable.group(
        {
            password: [
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
        password: {
            required: 'La contraseña es obligatoria.',
            minlength: 'La contraseña debe tener al menos 12 caracteres.',
            maxlength: 'La contraseña no puede superar los 128 caracteres.',
            uppercase: 'La contraseña debe contener al menos una letra mayúscula.',
            lowercase: 'La contraseña debe contener al menos una letra minúscula.',
            number: 'La contraseña debe contener al menos un número.',
            specialCharacter: 'La contraseña debe contener al menos un carácter especial.',
        },
        confirmPassword: {
            required: 'Debe confirmar la contraseña.',
            mismatch: 'Las contraseñas no coinciden.',
        },
    };

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

    private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
        const password = control.get('password')?.value;
        const confirmPassword = control.get('confirmPassword')?.value;

        if (!confirmPassword || password === confirmPassword) {
            return null;
        }

        return { mismatch: true };
    }

    resetForm(): void {
        this.form.reset({
            password: '',
            confirmPassword: '',
        });
    }

    save(): void {
        if (this.saving()) {
            return;
        }

        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return;
        }

        const { password, confirmPassword } = this.form.getRawValue();

        if (password !== confirmPassword) {
            this.toast.warn('Contraseñas diferentes', 'Las contraseñas ingresadas no coinciden.');
            return;
        }

        this.saving.set(true);

        this.usersService
            .updatePassword(this.user().user_id, password)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.saving.set(false)),
            )
            .subscribe({
                next: () => {
                    this.toast.success(
                        'Contraseña actualizada',
                        'La contraseña del usuario se actualizó correctamente.',
                    );

                    this.resetForm();
                    this.saved.emit();
                },
                error: (error) => {
                    const applied = this.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error(
                        'Error al actualizar',
                        'No fue posible actualizar la contraseña.',
                    );
                },
            });
    }

    applyValidationErrors(error: unknown): boolean {
        return applyServerValidationErrors(error, this.form);
    }
}
