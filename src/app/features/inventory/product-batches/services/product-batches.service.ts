import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import {
    ProductBatch,
    CreateProductBatch,
    UpdateProductBatch,
} from '../models/product-batche.model';
import { PaginationParams } from '../../../../core/http/models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class ProductBatchesService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/product-batches`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<ProductBatch>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<ProductBatch>>(this.apiUrl, { params: httpParams });
    }

    getById(productLineId: number): Observable<ApiResponse<ProductBatch>> {
        return this.http.get<ApiResponse<ProductBatch>>(`${this.apiUrl}/${productLineId}`);
    }

    create(payload: CreateProductBatch): Observable<ApiResponse<ProductBatch>> {
        return this.http.post<ApiResponse<ProductBatch>>(this.apiUrl, payload);
    }

    update(
        productLineId: number,
        payload: UpdateProductBatch,
    ): Observable<ApiResponse<ProductBatch>> {
        return this.http.patch<ApiResponse<ProductBatch>>(
            `${this.apiUrl}/${productLineId}`,
            payload,
        );
    }

    delete(productLineId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${productLineId}`);
    }
}
