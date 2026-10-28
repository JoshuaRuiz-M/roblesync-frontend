import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { AuthService } from '../../../../core/auth/services/auth.service';
import type { ProblemDetails } from '../../../../core/http/models/problem-details.model';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
    selector: 'app-login',
    imports: [ReactiveFormsModule, PasswordModule, ButtonModule, InputTextModule, MessageModule],
    templateUrl: './login.html',
    styleUrl: './login.scss',
})
export class Login {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly fb = inject(FormBuilder);
    private readonly toast = inject(ToastService);

    readonly loading = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly passwordVisible = signal(false);

    readonly loginForm = this.fb.nonNullable.group({
        username: ['', [Validators.required]],
        password: ['', [Validators.required]],
    });

    isInvalid(field: 'username' | 'password'): boolean {
        const control = this.loginForm.controls[field];

        return control.invalid && (control.touched || control.dirty);
    }

    submit(): void {
        if (this.loading()) {
            return;
        }

        this.errorMessage.set(null);

        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        this.loading.set(true);

        const credentials = this.loginForm.getRawValue();

        this.authService
            .login(credentials)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: () => {
                    this.loginForm.patchValue({
                        password: '',
                    });

                    this.toast.success('Inicio de sesión exitoso', 'Bienvenido al sistema.');

                    void this.router.navigateByUrl('/');
                },
                error: (error: unknown) => {
                    if (!(error instanceof HttpErrorResponse)) {
                        this.toast.error('Error de autenticación', 'Ocurrió un error inesperado.');
                        return;
                    }

                    if (
                        error.status === 0 ||
                        error.status === 403 ||
                        error.status === 429 ||
                        error.status >= 500
                    ) {
                        return;
                    }

                    this.errorMessage.set(this.getErrorMessage(error));

                    this.toast.error('No fue posible iniciar sesión', this.getErrorMessage(error));
                },
            });
    }

    togglePasswordVisibility(): void {
        this.passwordVisible.update((visible) => !visible);
    }

    private getErrorMessage(error: unknown): string {
        if (!(error instanceof HttpErrorResponse)) {
            return 'Ocurrió un error inesperado.';
        }

        if (error.status === 0) {
            return 'No fue posible conectar con el servidor.';
        }

        const problem = error.error as Partial<ProblemDetails> | null;

        if (problem && typeof problem === 'object' && typeof problem.detail === 'string') {
            return problem.detail;
        }

        switch (error.status) {
            case 400:
                return 'Verifica los datos ingresados.';

            case 401:
                return 'Credenciales incorrectas.';

            case 429:
                return 'Demasiados intentos de inicio de sesión. Inténtalo más tarde.';

            default:
                return 'No fue posible iniciar sesión.';
        }
    }
}
