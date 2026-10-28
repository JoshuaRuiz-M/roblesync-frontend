import { Injectable, inject } from '@angular/core';
import { ConfirmationService, type Confirmation } from 'primeng/api';

export interface ConfirmDialogOptions {
    header?: string;
    message: string;
    icon?: string;

    acceptLabel?: string;
    rejectLabel?: string;

    acceptButtonSeverity?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger';

    accept?: () => void;
    reject?: () => void;
}

@Injectable({
    providedIn: 'root',
})
export class ConfirmDialogService {
    private readonly confirmationService = inject(ConfirmationService);

    confirm(options: ConfirmDialogOptions): void {
        const confirmation: Confirmation = {
            key: 'global-confirm',
            header: options.header ?? 'Confirmar acción',
            message: options.message,
            icon: options.icon ?? 'pi pi-question-circle',

            acceptLabel: options.acceptLabel ?? 'Confirmar',
            rejectLabel: options.rejectLabel ?? 'Cancelar',

            acceptButtonStyleClass:
                options.acceptButtonSeverity === 'danger' ? 'p-button-danger' : undefined,

            accept: options.accept,
            reject: options.reject,
        };

        this.confirmationService.confirm(confirmation);
    }

    delete(message: string, accept: () => void): void {
        this.confirm({
            header: 'Confirmar eliminación',
            message,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonSeverity: 'danger',
            accept,
        });
    }

    close(): void {
        this.confirmationService.close();
    }
}
