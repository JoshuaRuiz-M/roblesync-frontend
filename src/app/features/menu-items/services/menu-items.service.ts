import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import type { ApiResponse, PaginatedResponse } from '../../../core/http/models/api-response.model';

import type { PaginationParams } from '../../../core/http/models/pagination.model';

import type { MenuItem, CreateMenuItem, UpdateMenuItem } from '../models/menu-item.model';

@Injectable({
    providedIn: 'root',
})
export class MenuItemsService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/menu-items`;

    /**
     * Obtiene el listado paginado de opciones de menú.
     *
     * GET /api/menu-items?page=1&limit=10
     */
    getAll(pagination: PaginationParams): Observable<PaginatedResponse<MenuItem>> {
        const params = new HttpParams().set('page', pagination.page).set('limit', pagination.limit);

        return this.http.get<PaginatedResponse<MenuItem>>(this.apiUrl, { params });
    }

    /**
     * Obtiene una opción de menú por su identificador.
     *
     * GET /api/menu-items/:id
     */
    getById(menuItemId: number): Observable<ApiResponse<MenuItem>> {
        return this.http.get<ApiResponse<MenuItem>>(`${this.apiUrl}/${menuItemId}`);
    }

    /**
     * Crea una nueva opción de menú.
     *
     * POST /api/menu-items
     */
    create(payload: CreateMenuItem): Observable<ApiResponse<MenuItem>> {
        return this.http.post<ApiResponse<MenuItem>>(this.apiUrl, payload);
    }

    /**
     * Actualiza parcialmente una opción de menú.
     *
     * PATCH /api/menu-items/:id
     */
    update(menuItemId: number, payload: UpdateMenuItem): Observable<ApiResponse<MenuItem>> {
        return this.http.patch<ApiResponse<MenuItem>>(`${this.apiUrl}/${menuItemId}`, payload);
    }

    /**
     * Elimina una opción de menú.
     *
     * DELETE /api/menu-items/:id
     *
     * Respuesta HTTP 204: No Content.
     */
    delete(menuItemId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${menuItemId}`);
    }

    /**
     * Obtiene la cantidad total de opciones de menú.
     *
     * GET /api/menu-items/count
     */
    count(): Observable<ApiResponse<number>> {
        return this.http.get<ApiResponse<number>>(`${this.apiUrl}/count`);
    }
}
