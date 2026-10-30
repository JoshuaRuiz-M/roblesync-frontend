import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import {
    Product,
    CreateProduct,
    UpdateProduct,
    ProductSupplier,
    UpdateProductSupplier,
    CreateProductSupplier,
    ProductSupplierDetail,
} from '../models/product.model';
import { PaginationParams } from '../../../../core/http/models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class ProductsService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/products`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<Product>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<Product>>(this.apiUrl, { params: httpParams });
    }

    getById(unitId: number): Observable<ApiResponse<Product>> {
        return this.http.get<ApiResponse<Product>>(`${this.apiUrl}/${unitId}`);
    }

    create(payload: CreateProduct): Observable<ApiResponse<Product>> {
        return this.http.post<ApiResponse<Product>>(this.apiUrl, payload);
    }

    update(unitId: number, payload: UpdateProduct): Observable<ApiResponse<Product>> {
        return this.http.patch<ApiResponse<Product>>(`${this.apiUrl}/${unitId}`, payload);
    }

    delete(unitId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${unitId}`);
    }

    getSuppliers(productId: number): Observable<ApiResponse<ProductSupplierDetail[]>> {
        return this.http.get<ApiResponse<ProductSupplierDetail[]>>(
            `${this.apiUrl}/${productId}/suppliers`,
        );
    }

    addSupplier(
        productId: number,
        payload: CreateProductSupplier,
    ): Observable<ApiResponse<ProductSupplier>> {
        return this.http.post<ApiResponse<ProductSupplier>>(
            `${this.apiUrl}/${productId}/suppliers`,
            payload,
        );
    }

    updateSupplier(
        productId: number,
        supplierId: number,
        payload: UpdateProductSupplier,
    ): Observable<ApiResponse<ProductSupplier>> {
        return this.http.patch<ApiResponse<ProductSupplier>>(
            `${this.apiUrl}/${productId}/suppliers/${supplierId}`,
            payload,
        );
    }

    setPreferredSupplier(
        productId: number,
        supplierId: number,
    ): Observable<ApiResponse<ProductSupplier>> {
        return this.http.patch<ApiResponse<ProductSupplier>>(
            `${this.apiUrl}/${productId}/suppliers/${supplierId}/preferred`,
            {},
        );
    }

    removeSupplier(
        productId: number,
        supplierId: number,
    ): Observable<ApiResponse<ProductSupplier>> {
        return this.http.delete<ApiResponse<ProductSupplier>>(
            `${this.apiUrl}/${productId}/suppliers/${supplierId}`,
        );
    }
}
