import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../../core/http/models/api-response.model';

import {
    UnitOfMeasure,
    CreateUnitOfMeasure,
    UpdateUnitOfMeasure,
} from '../models/unit-of-mesure.model';
import { PaginationParams } from '../../../../core/http/models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class UnitsOfMeasureService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/units-of-measure`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<UnitOfMeasure>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<UnitOfMeasure>>(this.apiUrl, { params: httpParams });
    }

    getById(unitId: number): Observable<ApiResponse<UnitOfMeasure>> {
        return this.http.get<ApiResponse<UnitOfMeasure>>(`${this.apiUrl}/${unitId}`);
    }

    create(payload: CreateUnitOfMeasure): Observable<ApiResponse<UnitOfMeasure>> {
        return this.http.post<ApiResponse<UnitOfMeasure>>(this.apiUrl, payload);
    }

    update(unitId: number, payload: UpdateUnitOfMeasure): Observable<ApiResponse<UnitOfMeasure>> {
        return this.http.patch<ApiResponse<UnitOfMeasure>>(`${this.apiUrl}/${unitId}`, payload);
    }

    delete(unitId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${unitId}`);
    }
}
