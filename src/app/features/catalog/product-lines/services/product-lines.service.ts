import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import { ProductLine, CreateProductLine, UpdateProductLine } from '../models/product-line.model';
import { PaginationParams } from '../../../../core/http/models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class ProductLinesService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/product-lines`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<ProductLine>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<ProductLine>>(this.apiUrl, { params: httpParams });
    }

    getById(productLineId: number): Observable<ApiResponse<ProductLine>> {
        return this.http.get<ApiResponse<ProductLine>>(`${this.apiUrl}/${productLineId}`);
    }

    create(payload: CreateProductLine): Observable<ApiResponse<ProductLine>> {
        return this.http.post<ApiResponse<ProductLine>>(this.apiUrl, payload);
    }

    update(
        productLineId: number,
        payload: UpdateProductLine,
    ): Observable<ApiResponse<ProductLine>> {
        return this.http.patch<ApiResponse<ProductLine>>(
            `${this.apiUrl}/${productLineId}`,
            payload,
        );
    }

    delete(productLineId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${productLineId}`);
    }
}
