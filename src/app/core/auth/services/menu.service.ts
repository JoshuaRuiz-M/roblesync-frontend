import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, map, Observable, of, shareReplay, Subject, takeUntil, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import type { ApiResponse } from '../../http/models/api-response.model';
import type { UserMenuItem } from '../models/user-menu-item.model';

@Injectable({
    providedIn: 'root',
})
export class MenuService {
    private readonly http = inject(HttpClient);

    private readonly menuState = signal<UserMenuItem[]>([]);
    private readonly loadedState = signal(false);
    private readonly loadingState = signal(false);

    private pendingRequest: Observable<UserMenuItem[]> | null = null;
    private cancelRequests = new Subject<void>();

    readonly menu = this.menuState.asReadonly();
    readonly loaded = this.loadedState.asReadonly();
    readonly loading = this.loadingState.asReadonly();

    readonly routes = computed(() => {
        const routes = new Set<string>();

        const collect = (items: UserMenuItem[]): void => {
            for (const item of items) {
                if (item.routerLink) {
                    routes.add(this.normalizePath(item.routerLink));
                }

                if (item.items?.length) {
                    collect(item.items);
                }
            }
        };

        collect(this.menuState());

        return routes;
    });

    loadMenu(): Observable<UserMenuItem[]> {
        if (this.loadedState()) {
            return of(this.menuState());
        }

        if (this.pendingRequest) {
            return this.pendingRequest;
        }

        this.loadingState.set(true);

        const cancelRequests = this.cancelRequests;

        const request = this.http
            .get<ApiResponse<UserMenuItem[]>>(`${environment.apiUrl}/auth/menu`)
            .pipe(
                map((response) => response.data),
                takeUntil(cancelRequests),
                tap((items) => {
                    this.menuState.set(items);
                    this.loadedState.set(true);
                }),
                finalize(() => {
                    if (this.pendingRequest === request) {
                        this.loadingState.set(false);
                        this.pendingRequest = null;
                    }
                }),
                shareReplay({
                    bufferSize: 1,
                    refCount: true,
                }),
            );

        this.pendingRequest = request;

        return request;
    }

    hasAccess(path: string): boolean {
        return this.routes().has(this.normalizePath(path));
    }

    clear(): void {
        this.cancelRequests.next();
        this.cancelRequests.complete();
        this.cancelRequests = new Subject<void>();

        this.menuState.set([]);
        this.loadedState.set(false);
        this.loadingState.set(false);
        this.pendingRequest = null;
    }

    private normalizePath(path: string): string {
        const normalized = path.split('?')[0].split('#')[0];

        return normalized.replace(/\/+$/, '') || '/';
    }
}
