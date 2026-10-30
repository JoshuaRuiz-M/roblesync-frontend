import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import { Customer, CreateCustomer, UpdateCustomer } from '../models/customer.model';
import { PaginationParams } from '../../../../core/http/models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class CustomersService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/customers`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<Customer>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<Customer>>(this.apiUrl, { params: httpParams });
    }

    getById(customerId: number): Observable<ApiResponse<Customer>> {
        return this.http.get<ApiResponse<Customer>>(`${this.apiUrl}/${customerId}`);
    }

    create(payload: CreateCustomer): Observable<ApiResponse<Customer>> {
        return this.http.post<ApiResponse<Customer>>(this.apiUrl, payload);
    }

    update(customerId: number, payload: UpdateCustomer): Observable<ApiResponse<Customer>> {
        return this.http.patch<ApiResponse<Customer>>(`${this.apiUrl}/${customerId}`, payload);
    }

    delete(customerId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${customerId}`);
    }
}
