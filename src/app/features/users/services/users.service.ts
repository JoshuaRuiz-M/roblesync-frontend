import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import { ApiResponse, PaginatedResponse } from '../../../core/http/models/api-response.model';

import { User, CreateUser, UpdateUser, UserRole, SyncUserRoles } from '../models/user.model';
import { PaginationParams } from '../../../core/http/models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class UsersService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/users`;

    // ==========================================
    // CRUD DE USUARIOS
    // ==========================================

    getAll(params: PaginationParams): Observable<PaginatedResponse<User>> {
        const httpParams = new HttpParams().set('page', params.page).set('limit', params.limit);

        return this.http.get<PaginatedResponse<User>>(this.apiUrl, { params: httpParams });
    }

    getById(userId: number): Observable<ApiResponse<User>> {
        return this.http.get<ApiResponse<User>>(`${this.apiUrl}/${userId}`);
    }

    create(payload: CreateUser): Observable<ApiResponse<User>> {
        return this.http.post<ApiResponse<User>>(this.apiUrl, payload);
    }

    update(userId: number, payload: UpdateUser): Observable<ApiResponse<User>> {
        return this.http.patch<ApiResponse<User>>(`${this.apiUrl}/${userId}`, payload);
    }

    delete(userId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${userId}`);
    }

    // ==========================================
    // ACTUALIZACIÓN DE CONTRASEÑA
    // ==========================================

    updatePassword(userId: number, password: string): Observable<ApiResponse<User>> {
        return this.update(userId, { password });
    }

    // ==========================================
    // ASIGNACIÓN DE ROLES
    // ==========================================

    getRoles(userId: number): Observable<ApiResponse<UserRole[]>> {
        return this.http.get<ApiResponse<UserRole[]>>(`${this.apiUrl}/${userId}/roles`);
    }

    syncRoles(userId: number, payload: SyncUserRoles): Observable<ApiResponse<UserRole[]>> {
        return this.http.put<ApiResponse<UserRole[]>>(`${this.apiUrl}/${userId}/roles`, payload);
    }
}
