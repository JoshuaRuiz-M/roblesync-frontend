import { Component, input } from '@angular/core';

@Component({
    selector: 'app-empty-state',
    imports: [],
    templateUrl: './empty-state.html',
    styleUrl: './empty-state.scss',
})
export class EmptyState {
    readonly icon = input<string>('pi pi-inbox');
    readonly title = input<string>('No hay registros disponibles');
    readonly description = input<string>('Todavía no existen elementos para mostrar.');
}
