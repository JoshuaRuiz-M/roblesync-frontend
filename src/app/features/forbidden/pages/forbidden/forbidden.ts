import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-forbidden',
    imports: [ButtonModule],
    templateUrl: './forbidden.html',
    styleUrl: './forbidden.scss',
})
export class Forbidden {
    private readonly router = inject(Router);

    goBack(): void {
        window.history.back();
    }

    goHome(): void {
        void this.router.navigateByUrl('/');
    }
}
