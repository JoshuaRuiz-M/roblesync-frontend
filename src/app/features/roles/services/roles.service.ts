import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import type { ApiResponse, PaginatedResponse } from '../../../core/http/models/api-response.model';

import type { PaginationParams } from '../../../core/http/models/pagination.model';

import type {
    Role,
    CreateRole,
    UpdateRole,
    RoleMenuItem,
    SyncRoleMenuItems,
    RolePermissionItem,
    SyncRolePermissions,
} from '../models/role.model';

@Injectable({
    providedIn: 'root',
})
export class RolesService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/roles`;

    // =========================
    // CRUD DE ROLES
    // =========================

    getAll(pagination: PaginationParams): Observable<PaginatedResponse<Role>> {
        const params = new HttpParams().set('page', pagination.page).set('limit', pagination.limit);

        return this.http.get<PaginatedResponse<Role>>(this.apiUrl, { params });
    }

    getById(roleId: number): Observable<ApiResponse<Role>> {
        return this.http.get<ApiResponse<Role>>(`${this.apiUrl}/${roleId}`);
    }

    create(payload: CreateRole): Observable<ApiResponse<Role>> {
        return this.http.post<ApiResponse<Role>>(this.apiUrl, payload);
    }

    update(roleId: number, payload: UpdateRole): Observable<ApiResponse<Role>> {
        return this.http.patch<ApiResponse<Role>>(`${this.apiUrl}/${roleId}`, payload);
    }

    delete(roleId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${roleId}`);
    }

    // =========================
    // ASIGNACIÓN DE PERMISOS
    // =========================

    getPermissions(roleId: number): Observable<ApiResponse<RolePermissionItem[]>> {
        return this.http.get<ApiResponse<RolePermissionItem[]>>(
            `${this.apiUrl}/${roleId}/permissions`,
        );
    }

    syncPermissions(
        roleId: number,
        payload: SyncRolePermissions,
    ): Observable<ApiResponse<RolePermissionItem[]>> {
        return this.http.put<ApiResponse<RolePermissionItem[]>>(
            `${this.apiUrl}/${roleId}/permissions`,
            payload,
        );
    }

    // =========================
    // ASIGNACIÓN DE MENÚS
    // =========================

    getMenuItems(roleId: number): Observable<ApiResponse<RoleMenuItem[]>> {
        return this.http.get<ApiResponse<RoleMenuItem[]>>(`${this.apiUrl}/${roleId}/menu-items`);
    }

    syncMenuItems(
        roleId: number,
        payload: SyncRoleMenuItems,
    ): Observable<ApiResponse<RoleMenuItem[]>> {
        return this.http.put<ApiResponse<RoleMenuItem[]>>(
            `${this.apiUrl}/${roleId}/menu-items`,
            payload,
        );
    }
}
