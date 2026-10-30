import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import {
    SupplierInvoice,
    CreateSupplierInvoice,
    UpdateSupplierInvoice,
} from '../models/supplier-invoice.model';
import { PaginationParams } from '../../../../core/http/models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class SupplierInvoicesService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/supplier-invoices`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<SupplierInvoice>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<SupplierInvoice>>(this.apiUrl, {
            params: httpParams,
        });
    }

    getById(supplierInvoiceId: number): Observable<ApiResponse<SupplierInvoice>> {
        return this.http.get<ApiResponse<SupplierInvoice>>(`${this.apiUrl}/${supplierInvoiceId}`);
    }

    create(payload: CreateSupplierInvoice): Observable<ApiResponse<SupplierInvoice>> {
        return this.http.post<ApiResponse<SupplierInvoice>>(this.apiUrl, payload);
    }

    update(
        supplierInvoiceId: number,
        payload: UpdateSupplierInvoice,
    ): Observable<ApiResponse<SupplierInvoice>> {
        return this.http.patch<ApiResponse<SupplierInvoice>>(
            `${this.apiUrl}/${supplierInvoiceId}`,
            payload,
        );
    }

    delete(supplierInvoiceId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${supplierInvoiceId}`);
    }
}
