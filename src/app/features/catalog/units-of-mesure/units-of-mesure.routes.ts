import { Routes } from '@angular/router';

export const UNITS_OF_MEASURE_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/units-of-mesure/units-of-mesure').then((m) => m.UnitsOfMeasure),
    },
];
