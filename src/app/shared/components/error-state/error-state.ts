import { Component, input } from '@angular/core';

@Component({
    selector: 'app-error-state',
    imports: [],
    templateUrl: './error-state.html',
    styleUrl: './error-state.scss',
})
export class ErrorState {
    readonly icon = input<string>('pi pi-exclamation-circle');

    readonly title = input<string>('No fue posible cargar la información');

    readonly description = input<string>(
        'Ocurrió un problema al obtener los datos. Intenta nuevamente.',
    );
}
