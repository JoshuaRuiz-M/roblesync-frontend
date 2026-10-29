import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../core/http/models/api-response.model';

import { Brand, CreateBrand, UpdateBrand } from '../models/brand.model';
import { PaginationParams } from '../../../core/http/models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class BrandsService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/brands`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<Brand>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<Brand>>(this.apiUrl, { params: httpParams });
    }

    getById(brandId: number): Observable<ApiResponse<Brand>> {
        return this.http.get<ApiResponse<Brand>>(`${this.apiUrl}/${brandId}`);
    }

    create(payload: CreateBrand): Observable<ApiResponse<Brand>> {
        return this.http.post<ApiResponse<Brand>>(this.apiUrl, payload);
    }

    update(brandId: number, payload: UpdateBrand): Observable<ApiResponse<Brand>> {
        return this.http.patch<ApiResponse<Brand>>(`${this.apiUrl}/${brandId}`, payload);
    }

    delete(brandId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${brandId}`);
    }
}
