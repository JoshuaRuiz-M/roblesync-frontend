import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, map, Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import { PaginationParams } from '../../../../core/http/models/pagination.model';

import {
    WarehouseTransfer,
    WarehouseTransferDetail,
    WarehouseTransferWithDetails,
    CreateWarehouseTransfer,
    UpdateWarehouseTransfer,
} from '../models/warehouse-transfer.model';

@Injectable({
    providedIn: 'root',
})
export class WarehouseTransfersService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/warehouse-transfers`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<WarehouseTransfer>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<WarehouseTransfer>>(this.apiUrl, {
            params: httpParams,
        });
    }

    getById(id: number): Observable<ApiResponse<WarehouseTransferWithDetails>> {
        return forkJoin({
            transfer: this.http.get<ApiResponse<WarehouseTransfer>>(`${this.apiUrl}/${id}`),
            details: this.getDetails(id),
        }).pipe(
            map(({ transfer, details }) => ({
                ...transfer,
                data: {
                    ...transfer.data,
                    details: details.data,
                },
            })),
        );
    }

    getDetails(id: number): Observable<ApiResponse<WarehouseTransferDetail[]>> {
        return this.http.get<ApiResponse<WarehouseTransferDetail[]>>(
            `${this.apiUrl}/${id}/details`,
        );
    }

    count(): Observable<ApiResponse<{ total: number }>> {
        return this.http.get<ApiResponse<{ total: number }>>(`${this.apiUrl}/count`);
    }

    create(data: CreateWarehouseTransfer): Observable<ApiResponse<WarehouseTransfer>> {
        return this.http.post<ApiResponse<WarehouseTransfer>>(this.apiUrl, data);
    }

    update(id: number, data: UpdateWarehouseTransfer): Observable<ApiResponse<WarehouseTransfer>> {
        return this.http.patch<ApiResponse<WarehouseTransfer>>(`${this.apiUrl}/${id}`, data);
    }

    dispatch(id: number): Observable<ApiResponse<WarehouseTransfer>> {
        return this.http.patch<ApiResponse<WarehouseTransfer>>(`${this.apiUrl}/${id}/dispatch`, {});
    }

    receive(id: number): Observable<ApiResponse<WarehouseTransfer>> {
        return this.http.patch<ApiResponse<WarehouseTransfer>>(`${this.apiUrl}/${id}/receive`, {});
    }

    cancel(id: number): Observable<ApiResponse<WarehouseTransfer>> {
        return this.http.patch<ApiResponse<WarehouseTransfer>>(`${this.apiUrl}/${id}/cancel`, {});
    }
}
