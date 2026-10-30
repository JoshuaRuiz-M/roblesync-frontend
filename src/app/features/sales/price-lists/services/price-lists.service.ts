import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import { PaginationParams } from '../../../../core/http/models/pagination.model';

import {
    PriceList,
    PriceListDetail,
    PriceListWithDetails,
    CreatePriceList,
    UpdatePriceList,
} from '../models/price-list.model';

@Injectable({
    providedIn: 'root',
})
export class PriceListsService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/price-lists`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<PriceList>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<PriceList>>(this.apiUrl, { params: httpParams });
    }

    getById(id: number): Observable<ApiResponse<PriceList>> {
        return this.http.get<ApiResponse<PriceList>>(`${this.apiUrl}/${id}`);
    }

    getDetails(id: number): Observable<ApiResponse<PriceListDetail[]>> {
        return this.http.get<ApiResponse<PriceListDetail[]>>(`${this.apiUrl}/${id}/details`);
    }

    getWithDetails(id: number): Observable<PriceListWithDetails> {
        return forkJoin({
            priceList: this.getById(id),
            details: this.getDetails(id),
        }).pipe(
            map(({ priceList, details }) => ({
                ...priceList.data,
                details: details.data,
            })),
        );
    }

    count(): Observable<ApiResponse<{ total: number }>> {
        return this.http.get<ApiResponse<{ total: number }>>(`${this.apiUrl}/count`);
    }

    create(data: CreatePriceList): Observable<ApiResponse<PriceList>> {
        return this.http.post<ApiResponse<PriceList>>(this.apiUrl, data);
    }

    update(id: number, data: UpdatePriceList): Observable<ApiResponse<PriceList>> {
        return this.http.patch<ApiResponse<PriceList>>(`${this.apiUrl}/${id}`, data);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
