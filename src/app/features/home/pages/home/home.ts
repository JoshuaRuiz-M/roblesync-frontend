import { Component, computed, inject } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Dashboard } from '../../../analytics/pages/dashboard/dashboard';

@Component({
    selector: 'app-home',
    imports: [Dashboard],
    templateUrl: './home.html',
    styleUrl: './home.scss',
})
export class Home {
    readonly appName = environment.appName;
    readonly appDescription = environment.appDescription;
    private readonly authService = inject(AuthService);
    readonly canViewDashboard = computed(() =>
        this.authService.hasPermission('ANALYTICS_DASHBOARD_READ'),
    );
}
