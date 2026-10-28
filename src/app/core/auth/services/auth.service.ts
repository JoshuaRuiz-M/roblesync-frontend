import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import type { ApiResponse } from '../../http/models/api-response.model';
import type { AuthProfile } from '../models/auth-profile.model';
import type { LoginRequest } from '../models/login-request.model';
import type { LoginResult } from '../models/login-result.model';
import { getTokenExpiration, isTokenExpired } from '../utils/jwt.util';
import { MenuService } from './menu.service';
import { Router } from '@angular/router';
import { ChangePasswordRequest } from '../models/change-password-request.model';

const TOKEN_KEY = 'auth_access_token';
const USER_KEY = 'auth_user';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly menuService = inject(MenuService);
    private readonly router = inject(Router);

    private expirationTimer: ReturnType<typeof setTimeout> | null = null;

    private readonly accessToken = signal<string | null>(localStorage.getItem(TOKEN_KEY));

    private readonly currentUser = signal<AuthProfile | null>(this.restoreUser());

    readonly user = this.currentUser.asReadonly();

    readonly isAuthenticated = computed(() => {
        const token = this.accessToken();
        const user = this.currentUser();

        return token !== null && user !== null && !isTokenExpired(token);
    });

    readonly fullName = computed(() => {
        const user = this.currentUser();

        if (!user) {
            return '';
        }

        return `${user.first_name} ${user.last_name}`.trim();
    });

    constructor() {
        const token = this.accessToken();
        const user = this.currentUser();

        if (!token || !user || isTokenExpired(token)) {
            this.logout();
            return;
        }

        this.scheduleTokenExpiration(token);
    }

    login(credentials: LoginRequest): Observable<LoginResult> {
        return this.http
            .post<ApiResponse<LoginResult>>(`${environment.apiUrl}/auth/login`, credentials)
            .pipe(
                map((response) => response.data),
                tap((result) => {
                    localStorage.setItem(TOKEN_KEY, result.access_token);
                    localStorage.setItem(USER_KEY, JSON.stringify(result.user));

                    this.accessToken.set(result.access_token);
                    this.currentUser.set(result.user);

                    this.scheduleTokenExpiration(result.access_token);
                }),
            );
    }

    changePassword(payload: ChangePasswordRequest): Observable<void> {
        return this.http.patch<void>(`${environment.apiUrl}/auth/me/password`, payload);
    }

    getAccessToken(): string | null {
        const token = this.accessToken();

        if (!token) {
            return null;
        }

        if (isTokenExpired(token)) {
            this.logout();
            return null;
        }

        return token;
    }

    logout(): void {
        this.clearExpirationTimer();
        this.menuService.clear();

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        this.accessToken.set(null);
        this.currentUser.set(null);
    }

    hasPermission(permission: string): boolean {
        return this.currentUser()?.permissions?.includes(permission) ?? false;
    }

    hasAnyPermission(permissions: string[]): boolean {
        return permissions.some((permission) => this.hasPermission(permission));
    }

    hasAllPermissions(permissions: string[]): boolean {
        return permissions.every((permission) => this.hasPermission(permission));
    }

    private restoreUser(): AuthProfile | null {
        const storedUser = localStorage.getItem(USER_KEY);

        if (!storedUser) {
            return null;
        }

        try {
            return JSON.parse(storedUser) as AuthProfile;
        } catch {
            localStorage.removeItem(USER_KEY);
            return null;
        }
    }

    private scheduleTokenExpiration(token: string): void {
        this.clearExpirationTimer();

        const expiration = getTokenExpiration(token);

        if (expiration === null) {
            this.logout();
            return;
        }

        const remainingTime = expiration - Date.now();

        if (remainingTime <= 0) {
            this.logout();
            return;
        }

        this.expirationTimer = setTimeout(
            () => {
                if (this.accessToken() !== token) {
                    return;
                }

                if (!isTokenExpired(token)) {
                    this.scheduleTokenExpiration(token);
                    return;
                }

                this.logout();

                void this.router.navigateByUrl('/auth/login', {
                    replaceUrl: true,
                });
            },
            Math.min(remainingTime, 2_147_483_647),
        );
    }

    private clearExpirationTimer(): void {
        if (this.expirationTimer !== null) {
            clearTimeout(this.expirationTimer);
            this.expirationTimer = null;
        }
    }
}
