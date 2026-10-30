import { Routes } from '@angular/router';

export const SALESPERSONS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/salespersons/salespersons').then((m) => m.Salespersons),
    },
];
