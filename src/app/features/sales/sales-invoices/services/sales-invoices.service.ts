import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import { PaginationParams } from '../../../../core/http/models/pagination.model';

import {
    SalesInvoice,
    SalesInvoiceDetail,
    SalesInvoiceWithDetails,
    CreateSalesInvoice,
    CancelSalesInvoice,
} from '../models/sales-invoice.model';

@Injectable({
    providedIn: 'root',
})
export class SalesInvoicesService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/sales-invoices`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<SalesInvoice>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<SalesInvoice>>(this.apiUrl, { params: httpParams });
    }

    getById(id: number): Observable<ApiResponse<SalesInvoice>> {
        return this.http.get<ApiResponse<SalesInvoice>>(`${this.apiUrl}/${id}`);
    }

    getDetails(id: number): Observable<ApiResponse<SalesInvoiceDetail[]>> {
        return this.http.get<ApiResponse<SalesInvoiceDetail[]>>(`${this.apiUrl}/${id}/details`);
    }

    getByIdWithDetails(id: number): Observable<SalesInvoiceWithDetails> {
        return forkJoin({
            invoice: this.getById(id),
            details: this.getDetails(id),
        }).pipe(
            map(({ invoice, details }) => ({
                ...invoice.data,
                details: details.data,
            })),
        );
    }

    count(): Observable<ApiResponse<{ total: number }>> {
        return this.http.get<ApiResponse<{ total: number }>>(`${this.apiUrl}/count`);
    }

    create(data: CreateSalesInvoice): Observable<ApiResponse<SalesInvoice>> {
        return this.http.post<ApiResponse<SalesInvoice>>(this.apiUrl, data);
    }

    cancel(id: number, data: CancelSalesInvoice): Observable<ApiResponse<SalesInvoice>> {
        return this.http.patch<ApiResponse<SalesInvoice>>(`${this.apiUrl}/${id}/cancel`, data);
    }
}
