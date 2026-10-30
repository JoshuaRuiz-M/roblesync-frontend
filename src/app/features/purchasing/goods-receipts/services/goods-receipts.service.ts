import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import { PaginationParams } from '../../../../core/http/models/pagination.model';

import {
    GoodsReceipt,
    GoodsReceiptDetail,
    GoodsReceiptWithDetails,
    CreateGoodsReceipt,
    UpdateGoodsReceipt,
} from '../models/goods-receipt.model';

@Injectable({
    providedIn: 'root',
})
export class GoodsReceiptsService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/goods-receipts`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<GoodsReceipt>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<GoodsReceipt>>(this.apiUrl, { params: httpParams });
    }

    getById(id: number): Observable<ApiResponse<GoodsReceipt>> {
        return this.http.get<ApiResponse<GoodsReceipt>>(`${this.apiUrl}/${id}`);
    }

    getDetails(id: number): Observable<ApiResponse<GoodsReceiptDetail[]>> {
        return this.http.get<ApiResponse<GoodsReceiptDetail[]>>(`${this.apiUrl}/${id}/details`);
    }

    getByIdWithDetails(id: number): Observable<GoodsReceiptWithDetails> {
        return forkJoin({
            receipt: this.getById(id),
            details: this.getDetails(id),
        }).pipe(
            map(({ receipt, details }) => ({
                ...receipt.data,
                details: details.data,
            })),
        );
    }

    count(): Observable<ApiResponse<{ total: number }>> {
        return this.http.get<ApiResponse<{ total: number }>>(`${this.apiUrl}/count`);
    }

    create(data: CreateGoodsReceipt): Observable<ApiResponse<GoodsReceipt>> {
        return this.http.post<ApiResponse<GoodsReceipt>>(this.apiUrl, data);
    }

    update(id: number, data: UpdateGoodsReceipt): Observable<ApiResponse<GoodsReceipt>> {
        return this.http.patch<ApiResponse<GoodsReceipt>>(`${this.apiUrl}/${id}`, data);
    }

    confirm(id: number): Observable<ApiResponse<GoodsReceipt>> {
        return this.http.patch<ApiResponse<GoodsReceipt>>(`${this.apiUrl}/${id}/confirm`, {});
    }

    cancel(id: number): Observable<ApiResponse<GoodsReceipt>> {
        return this.http.patch<ApiResponse<GoodsReceipt>>(`${this.apiUrl}/${id}/cancel`, {});
    }
}
