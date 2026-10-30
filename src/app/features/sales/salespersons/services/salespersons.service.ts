import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import { Saleperson, CreateSaleperson, UpdateSaleperson } from '../models/salesperson.model';
import { PaginationParams } from '../../../../core/http/models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class SalespersonsService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/salespersons`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<Saleperson>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<Saleperson>>(this.apiUrl, { params: httpParams });
    }

    getById(salepersonId: number): Observable<ApiResponse<Saleperson>> {
        return this.http.get<ApiResponse<Saleperson>>(`${this.apiUrl}/${salepersonId}`);
    }

    create(payload: CreateSaleperson): Observable<ApiResponse<Saleperson>> {
        return this.http.post<ApiResponse<Saleperson>>(this.apiUrl, payload);
    }

    update(salepersonId: number, payload: UpdateSaleperson): Observable<ApiResponse<Saleperson>> {
        return this.http.patch<ApiResponse<Saleperson>>(`${this.apiUrl}/${salepersonId}`, payload);
    }

    delete(salepersonId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${salepersonId}`);
    }
}
