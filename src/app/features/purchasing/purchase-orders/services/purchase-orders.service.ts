import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import { PaginationParams } from '../../../../core/http/models/pagination.model';

import {
    PurchaseOrder,
    PurchaseOrderWithDetails,
    CreatePurchaseOrder,
    UpdatePurchaseOrder,
} from '../models/purchase-order.model';

@Injectable({
    providedIn: 'root',
})
export class PurchaseOrdersService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/purchase-orders`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<PurchaseOrder>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<PurchaseOrder>>(this.apiUrl, { params: httpParams });
    }

    getById(id: number): Observable<ApiResponse<PurchaseOrderWithDetails>> {
        return this.http.get<ApiResponse<PurchaseOrderWithDetails>>(`${this.apiUrl}/${id}`);
    }

    count(): Observable<ApiResponse<{ total: number }>> {
        return this.http.get<ApiResponse<{ total: number }>>(`${this.apiUrl}/count`);
    }

    create(data: CreatePurchaseOrder): Observable<ApiResponse<PurchaseOrderWithDetails>> {
        return this.http.post<ApiResponse<PurchaseOrderWithDetails>>(this.apiUrl, data);
    }

    update(
        id: number,
        data: UpdatePurchaseOrder,
    ): Observable<ApiResponse<PurchaseOrderWithDetails>> {
        return this.http.patch<ApiResponse<PurchaseOrderWithDetails>>(`${this.apiUrl}/${id}`, data);
    }

    approve(id: number): Observable<ApiResponse<PurchaseOrderWithDetails>> {
        return this.http.patch<ApiResponse<PurchaseOrderWithDetails>>(
            `${this.apiUrl}/${id}/approve`,
            {},
        );
    }

    cancel(id: number): Observable<ApiResponse<PurchaseOrderWithDetails>> {
        return this.http.patch<ApiResponse<PurchaseOrderWithDetails>>(
            `${this.apiUrl}/${id}/cancel`,
            {},
        );
    }
}
