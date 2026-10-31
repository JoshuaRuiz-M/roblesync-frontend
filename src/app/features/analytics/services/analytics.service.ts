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
}
