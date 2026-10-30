import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, map, Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import { PaginationParams } from '../../../../core/http/models/pagination.model';

import {
    SalesOrder,
    SalesOrderDetail,
    SalesOrderWithDetails,
    CreateSalesOrder,
    UpdateSalesOrder,
} from '../models/sales-order.model';

@Injectable({
    providedIn: 'root',
})
export class SalesOrdersService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/sales-orders`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<SalesOrder>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<SalesOrder>>(this.apiUrl, {
            params: httpParams,
        });
    }

    getById(id: number): Observable<ApiResponse<SalesOrderWithDetails>> {
        return forkJoin({
            order: this.http.get<ApiResponse<SalesOrder>>(`${this.apiUrl}/${id}`),
            details: this.getDetails(id),
        }).pipe(
            map(({ order, details }) => ({
                ...order,
                data: {
                    ...order.data,
                    details: details.data,
                },
            })),
        );
    }

    getDetails(id: number): Observable<ApiResponse<SalesOrderDetail[]>> {
        return this.http.get<ApiResponse<SalesOrderDetail[]>>(`${this.apiUrl}/${id}/details`);
    }

    count(): Observable<ApiResponse<{ total: number }>> {
        return this.http.get<ApiResponse<{ total: number }>>(`${this.apiUrl}/count`);
    }

    create(data: CreateSalesOrder): Observable<ApiResponse<SalesOrder>> {
        return this.http.post<ApiResponse<SalesOrder>>(this.apiUrl, data);
    }

    update(id: number, data: UpdateSalesOrder): Observable<ApiResponse<SalesOrder>> {
        return this.http.patch<ApiResponse<SalesOrder>>(`${this.apiUrl}/${id}`, data);
    }

    submit(id: number): Observable<ApiResponse<SalesOrder>> {
        return this.http.patch<ApiResponse<SalesOrder>>(`${this.apiUrl}/${id}/submit`, {});
    }

    approve(id: number): Observable<ApiResponse<SalesOrder>> {
        return this.http.patch<ApiResponse<SalesOrder>>(`${this.apiUrl}/${id}/approve`, {});
    }

    reserve(id: number): Observable<ApiResponse<SalesOrder>> {
        return this.http.patch<ApiResponse<SalesOrder>>(`${this.apiUrl}/${id}/reserve`, {});
    }

    cancel(id: number): Observable<ApiResponse<SalesOrder>> {
        return this.http.patch<ApiResponse<SalesOrder>>(`${this.apiUrl}/${id}/cancel`, {});
    }

    approveCredit(id: number): Observable<ApiResponse<SalesOrder>> {
        return this.http.patch<ApiResponse<SalesOrder>>(`${this.apiUrl}/${id}/approve-credit`, {});
    }

    rejectCredit(id: number): Observable<ApiResponse<SalesOrder>> {
        return this.http.patch<ApiResponse<SalesOrder>>(`${this.apiUrl}/${id}/reject-credit`, {});
    }
}
