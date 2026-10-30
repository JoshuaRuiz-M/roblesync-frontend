import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import { SaleTarget, CreateSalesTarget, UpdateSalesTarget } from '../models/sales-targets.model';
import { PaginationParams } from '../../../../core/http/models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class SalesTargetsService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/sales-targets`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<SaleTarget>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<SaleTarget>>(this.apiUrl, { params: httpParams });
    }

    getById(salepersonId: number): Observable<ApiResponse<SaleTarget>> {
        return this.http.get<ApiResponse<SaleTarget>>(`${this.apiUrl}/${salepersonId}`);
    }

    create(payload: CreateSalesTarget): Observable<ApiResponse<SaleTarget>> {
        return this.http.post<ApiResponse<SaleTarget>>(this.apiUrl, payload);
    }

    update(salepersonId: number, payload: UpdateSalesTarget): Observable<ApiResponse<SaleTarget>> {
        return this.http.patch<ApiResponse<SaleTarget>>(`${this.apiUrl}/${salepersonId}`, payload);
    }

    delete(salepersonId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${salepersonId}`);
    }
}
