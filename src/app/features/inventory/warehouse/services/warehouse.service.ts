import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import { Warehouse, CreateWarehouse, UpdateWarehouse } from '../models/warehouse.model';
import { PaginationParams } from '../../../../core/http/models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class WarehousesService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/warehouses`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<Warehouse>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<Warehouse>>(this.apiUrl, { params: httpParams });
    }

    getById(warehouseId: number): Observable<ApiResponse<Warehouse>> {
        return this.http.get<ApiResponse<Warehouse>>(`${this.apiUrl}/${warehouseId}`);
    }

    create(payload: CreateWarehouse): Observable<ApiResponse<Warehouse>> {
        return this.http.post<ApiResponse<Warehouse>>(this.apiUrl, payload);
    }

    update(warehouseId: number, payload: UpdateWarehouse): Observable<ApiResponse<Warehouse>> {
        return this.http.patch<ApiResponse<Warehouse>>(`${this.apiUrl}/${warehouseId}`, payload);
    }

    delete(warehouseId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${warehouseId}`);
    }
}
