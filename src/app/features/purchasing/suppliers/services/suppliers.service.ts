import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import { Supplier, CreateSupplier, UpdateSupplier } from '../models/supplier.model';
import { PaginationParams } from '../../../../core/http/models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class SuppliersService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/suppliers`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<Supplier>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<Supplier>>(this.apiUrl, { params: httpParams });
    }

    getById(supplierId: number): Observable<ApiResponse<Supplier>> {
        return this.http.get<ApiResponse<Supplier>>(`${this.apiUrl}/${supplierId}`);
    }

    create(payload: CreateSupplier): Observable<ApiResponse<Supplier>> {
        return this.http.post<ApiResponse<Supplier>>(this.apiUrl, payload);
    }

    update(supplierId: number, payload: UpdateSupplier): Observable<ApiResponse<Supplier>> {
        return this.http.patch<ApiResponse<Supplier>>(`${this.apiUrl}/${supplierId}`, payload);
    }

    delete(supplierId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${supplierId}`);
    }
}
