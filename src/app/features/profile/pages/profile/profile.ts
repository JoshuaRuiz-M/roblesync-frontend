import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';

import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';

import { AuthService } from '../../../../core/auth/services/auth.service';
import { UsersService } from '../../../users/services/users.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ProfilePassword } from '../../components/profile-password/profile-password';
import { FormDialog } from '../../../../shared/components/form-dialog/form-dialog';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-profile',
    imports: [AvatarModule, TagModule, ButtonModule, FormDialog, ProfilePassword],
    templateUrl: './profile.html',
    styleUrl: './profile.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
    private readonly authService = inject(AuthService);

    readonly user = this.authService.user;
    readonly fullName = this.authService.fullName;

    private readonly usersService = inject(UsersService);
    private readonly toast = inject(ToastService);

    readonly passwordDialogVisible = signal(false);
    readonly saving = signal(false);

    readonly passwordForm = viewChild(ProfilePassword);

    openPasswordDialog(): void {
        this.passwordDialogVisible.set(true);
        this.passwordForm()?.resetForm();
    }

    savePassword(): void {
        const form = this.passwordForm();

        if (!form || this.saving()) {
            return;
        }

        const payload = form.getPayload();

        if (!payload) {
            return;
        }

        this.saving.set(true);

        this.authService
            .changePassword(payload)
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
                next: () => {
                    form.resetForm();
                    this.passwordDialogVisible.set(false);

                    this.toast.success(
                        'Contraseña actualizada',
                        'Tu contraseña se actualizó correctamente.',
                    );
                },
                error: (error: unknown) => {
                    const applied = form.applyValidationErrors(error);

                    if (applied) {
                        return;
                    }

                    this.toast.error(
                        'Error al actualizar la contraseña',
                        'Ocurrió un error al actualizar tu contraseña. Por favor, intenta nuevamente.',
                    );
                },
            });
    }
}
