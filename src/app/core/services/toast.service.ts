import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
    providedIn: 'root',
})
export class ToastService {
    private readonly messageService = inject(MessageService);

    success(summary: string, detail?: string): void {
        this.show('success', summary, detail);
    }

    error(summary: string, detail?: string): void {
        this.show('error', summary, detail);
    }

    warn(summary: string, detail?: string): void {
        this.show('warn', summary, detail);
    }

    info(summary: string, detail?: string): void {
        this.show('info', summary, detail);
    }

    clear(): void {
        this.messageService.clear();
    }

    private show(
        severity: 'success' | 'error' | 'warn' | 'info',
        summary: string,
        detail?: string,
    ): void {
        this.messageService.add({
            severity,
            summary,
            detail,
            life: 4000,
        });
    }
}
