import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import type { PaginatedResponse } from '../../../core/http/models/api-response.model';

import type { PaginationParams } from '../../../core/http/models/pagination.model';

import type { Permission } from '../models/permission.model';

@Injectable({
    providedIn: 'root',
})
export class PermissionsService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/permissions`;

    getAll(pagination: PaginationParams): Observable<PaginatedResponse<Permission>> {
        const params = new HttpParams().set('page', pagination.page).set('limit', pagination.limit);

        return this.http.get<PaginatedResponse<Permission>>(this.apiUrl, { params });
    }
}
