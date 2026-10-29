import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../core/http/models/api-response.model';

import { Category, CreateCategory, UpdateCategory } from '../models/category.model';
import { PaginationParams } from '../../../core/http/models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class CategoriesService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/categories`;

    getAll(params: PaginationParams): Observable<PaginatedResponse<Category>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<Category>>(this.apiUrl, { params: httpParams });
    }

    getById(categoryId: number): Observable<ApiResponse<Category>> {
        return this.http.get<ApiResponse<Category>>(`${this.apiUrl}/${categoryId}`);
    }

    create(payload: CreateCategory): Observable<ApiResponse<Category>> {
        return this.http.post<ApiResponse<Category>>(this.apiUrl, payload);
    }

    update(categoryId: number, payload: UpdateCategory): Observable<ApiResponse<Category>> {
        return this.http.patch<ApiResponse<Category>>(`${this.apiUrl}/${categoryId}`, payload);
    }

    delete(categoryId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${categoryId}`);
    }
}
