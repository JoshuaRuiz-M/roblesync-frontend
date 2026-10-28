import { Component, input } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
    selector: 'app-loading-state',
    imports: [ProgressSpinnerModule],
    templateUrl: './loading-state.html',
    styleUrl: './loading-state.scss',
})
export class LoadingState {
    readonly title = input<string>('Cargando información');

    readonly description = input<string>('Por favor, espera mientras obtenemos los datos.');

    readonly size = input<number>(48);
}
