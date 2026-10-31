import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
    KardexFilters,
    KardexMovement,
    KardexSummary,
    KardexSummaryFilters,
} from '../models/analytics.model';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../../../core/http/models/api-response.model';
import {
    DashboardDateFilters,
    DashboardInventoryAlert,
    DashboardInventoryAlertsFilters,
    DashboardOverview,
    DashboardSalesByCategory,
    DashboardSalesTrend,
    DashboardTopProduct,
    DashboardTopProductsFilters,
} from '../models/dashboard.model';

@Injectable({
    providedIn: 'root',
})
export class AnalyticsService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/analytics`;

    getKardex(filters: KardexFilters): Observable<PaginatedResponse<KardexMovement>> {
        let params = new HttpParams();

        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null && value !== '') {
                params = params.set(key, String(value));
            }
        }

        return this.http.get<PaginatedResponse<KardexMovement>>(`${this.apiUrl}/movements`, {
            params,
        });
    }

    getKardexSummary(filters: KardexSummaryFilters): Observable<ApiResponse<KardexSummary>> {
        let params = new HttpParams();

        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null && value !== '') {
                params = params.set(key, String(value));
            }
        }

        return this.http.get<ApiResponse<KardexSummary>>(`${this.apiUrl}/summary`, { params });
    }

    getDashboardOverview(filters: DashboardDateFilters = {}) {
        return this.http.get<ApiResponse<DashboardOverview>>(`${this.apiUrl}/dashboard/overview`, {
            params: this.buildDashboardParams(filters),
        });
    }

    getDashboardSalesTrend(filters: DashboardDateFilters = {}) {
        return this.http.get<ApiResponse<DashboardSalesTrend[]>>(
            `${this.apiUrl}/dashboard/sales-trend`,
            { params: this.buildDashboardParams(filters) },
        );
    }

    getDashboardTopProducts(filters: DashboardTopProductsFilters = {}) {
        return this.http.get<ApiResponse<DashboardTopProduct[]>>(
            `${this.apiUrl}/dashboard/top-products`,
            { params: this.buildDashboardParams(filters) },
        );
    }

    getDashboardSalesByCategory(filters: DashboardDateFilters = {}) {
        return this.http.get<ApiResponse<DashboardSalesByCategory[]>>(
            `${this.apiUrl}/dashboard/sales-by-category`,
            { params: this.buildDashboardParams(filters) },
        );
    }

    getDashboardInventoryAlerts(filters: DashboardInventoryAlertsFilters = {}) {
        return this.http.get<ApiResponse<DashboardInventoryAlert[]>>(
            `${this.apiUrl}/dashboard/inventory-alerts`,
            { params: this.buildDashboardParams(filters) },
        );
    }

    private buildDashboardParams(filters: object): HttpParams {
        let params = new HttpParams();

        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null && value !== '') {
                params = params.set(key, String(value));
            }
        }

        return params;
    }
}
