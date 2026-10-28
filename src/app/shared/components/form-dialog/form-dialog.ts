import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
    selector: 'app-form-dialog',
    standalone: true,
    imports: [DialogModule, ButtonModule, ProgressSpinnerModule],
    templateUrl: './form-dialog.html',
    styleUrl: './form-dialog.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormDialog {
    // Estado controlado por el componente padre
    readonly visible = model(false);

    // Configuración visual
    readonly title = input('Formulario');
    readonly description = input<string>();

    readonly width = input('32rem');
    readonly maxWidth = input('95vw');

    // Estado de procesamiento
    readonly loading = input(false);
    readonly saveDisabled = input(false);

    // Configuración de botones
    readonly saveLabel = input('Guardar');
    readonly cancelLabel = input('Cancelar');
    readonly saveIcon = input('pi pi-check');

    // Comportamiento
    readonly closable = input(true);
    readonly dismissableMask = input(false);
    readonly closeOnEscape = input(true);

    // Eventos
    readonly save = output<void>();
    // eslint-disable-next-line @angular-eslint/no-output-native
    readonly cancel = output<void>();

    onSave(): void {
        if (this.loading() || this.saveDisabled()) {
            return;
        }

        this.save.emit();
    }

    onCancel(): void {
        if (this.loading()) {
            return;
        }

        this.visible.set(false);
        this.cancel.emit();
    }

    onVisibleChange(visible: boolean): void {
        if (!visible && this.loading()) {
            return;
        }

        this.visible.set(visible);

        if (!visible) {
            this.cancel.emit();
        }
    }
}
