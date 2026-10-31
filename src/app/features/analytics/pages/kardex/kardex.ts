import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { EMPTY, Observable, expand, firstValueFrom, reduce } from 'rxjs';

import { PaginatedResponse } from '../../../../core/http/models/api-response.model';

import { AnalyticsService } from '../../services/analytics.service';

import {
    KardexFilters,
    KardexMovement,
    KardexSummary,
    InventoryMovementType,
} from '../../models/analytics.model';
import { ProductsService } from '../../../catalog/products/services/products.service';
import { WarehousesService } from '../../../inventory/warehouse/services/warehouse.service';
import { ProductBatchesService } from '../../../inventory/product-batches/services/product-batches.service';

interface SelectOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-kardex',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        CardModule,
        SelectModule,
        DatePickerModule,
        TableModule,
        TagModule,
    ],
    templateUrl: './kardex.html',
    styleUrl: './kardex.scss',
})
export class Kardex implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly analyticsService = inject(AnalyticsService);
    private readonly productsService = inject(ProductsService);
    private readonly warehousesService = inject(WarehousesService);
    private readonly batchesService = inject(ProductBatchesService);

    readonly movements = signal<KardexMovement[]>([]);
    readonly summary = signal<KardexSummary | null>(null);

    readonly products = signal<SelectOption[]>([]);
    readonly warehouses = signal<SelectOption[]>([]);
    readonly batches = signal<SelectOption[]>([]);

    readonly loading = signal(false);
    readonly loadingCatalogs = signal(false);
    readonly totalRecords = signal(0);
    readonly error = signal<string | null>(null);

    readonly movementTypes = [
        { label: 'Recepción de compra', value: 'PURCHASE_RECEIPT' },
        { label: 'Salida por venta', value: 'SALE_DISPATCH' },
        { label: 'Entrada por transferencia', value: 'TRANSFER_IN' },
        { label: 'Salida por transferencia', value: 'TRANSFER_OUT' },
        { label: 'Ajuste de entrada', value: 'ADJUSTMENT_IN' },
        { label: 'Ajuste de salida', value: 'ADJUSTMENT_OUT' },
        { label: 'Devolución de entrada', value: 'RETURN_IN' },
        { label: 'Devolución de salida', value: 'RETURN_OUT' },
    ];

    readonly form = this.fb.group({
        product_id: this.fb.control<number | null>(null),
        warehouse_id: this.fb.control<number | null>(null),
        batch_id: this.fb.control<number | null>(null),
        movement_type: this.fb.control<InventoryMovementType | null>(null),
        start_date: this.fb.control<Date | null>(null),
        end_date: this.fb.control<Date | null>(null),
    });

    page = 1;
    limit = 10;

    private activeFilters: KardexFilters = {};
    private requestVersion = 0;

    async ngOnInit(): Promise<void> {
        await this.loadCatalogs();
        await this.search();
    }

    private loadAll<T>(
        fetchPage: (page: number) => Observable<PaginatedResponse<T>>,
    ): Promise<T[]> {
        return firstValueFrom(
            fetchPage(1).pipe(
                expand((response) =>
                    response.meta.hasNextPage ? fetchPage(response.meta.page + 1) : EMPTY,
                ),
                reduce((items, response) => {
                    items.push(...response.data);
                    return items;
                }, [] as T[]),
            ),
        );
    }

    async loadCatalogs(): Promise<void> {
        this.loadingCatalogs.set(true);

        try {
            const [products, warehouses, batches] = await Promise.all([
                this.loadAll((page) => this.productsService.getAll({ page, limit: 100 })),
                this.loadAll((page) => this.warehousesService.getAll({ page, limit: 100 })),
                this.loadAll((page) => this.batchesService.getAll({ page, limit: 100 })),
            ]);

            this.products.set(
                products.map((product) => ({
                    label: product.name,
                    value: product.product_id,
                })),
            );

            this.warehouses.set(
                warehouses.map((warehouse) => ({
                    label: warehouse.name,
                    value: warehouse.warehouse_id,
                })),
            );

            this.batches.set(
                batches.map((batch) => ({
                    label: batch.batch_number,
                    value: batch.batch_id,
                })),
            );
        } catch {
            this.error.set('No se pudieron cargar los catálogos.');
        } finally {
            this.loadingCatalogs.set(false);
        }
    }

    private formatDate(date: Date | null): string | undefined {
        if (!date) return undefined;

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    private buildFilters(): KardexFilters {
        const values = this.form.getRawValue();

        return {
            product_id: values.product_id ?? undefined,
            warehouse_id: values.warehouse_id ?? undefined,
            batch_id: values.batch_id ?? undefined,
            movement_type: values.movement_type ?? undefined,
            start_date: this.formatDate(values.start_date),
            end_date: this.formatDate(values.end_date),
        };
    }

    async search(): Promise<void> {
        const filters = this.buildFilters();

        if (filters.start_date && filters.end_date && filters.start_date > filters.end_date) {
            this.error.set('La fecha inicial no puede superar la fecha final.');
            return;
        }

        this.activeFilters = filters;
        this.page = 1;

        await this.loadData();
    }

    async loadMovements(event: TableLazyLoadEvent): Promise<void> {
        this.limit = event.rows ?? 10;
        this.page = Math.floor((event.first ?? 0) / this.limit) + 1;

        await this.loadData();
    }

    private async loadData(): Promise<void> {
        const version = ++this.requestVersion;

        this.loading.set(true);
        this.error.set(null);

        const filters: KardexFilters = {
            ...this.activeFilters,
            page: this.page,
            limit: this.limit,
        };

        try {
            const response = await firstValueFrom(this.analyticsService.getKardex(filters));

            if (version !== this.requestVersion) return;

            this.movements.set(response.data);
            this.totalRecords.set(response.meta.total);
        } catch (error) {
            if (version !== this.requestVersion) return;

            this.movements.set([]);
            this.totalRecords.set(0);
            this.handleError(error);
        } finally {
            if (version === this.requestVersion) {
                this.loading.set(false);
            }
        }

        if (version !== this.requestVersion) return;

        await this.loadSummary(version);
    }

    private async loadSummary(version: number): Promise<void> {
        const { product_id, warehouse_id, start_date, end_date } = this.activeFilters;

        if (!product_id || !warehouse_id) {
            this.summary.set(null);
            return;
        }

        try {
            const response = await firstValueFrom(
                this.analyticsService.getKardexSummary({
                    product_id,
                    warehouse_id,
                    start_date,
                    end_date,
                }),
            );

            if (version === this.requestVersion) {
                this.summary.set(response.data);
            }
        } catch (error) {
            if (version === this.requestVersion) {
                this.summary.set(null);
                this.handleError(error);
            }
        }
    }

    async clearFilters(): Promise<void> {
        this.form.reset();
        this.limit = 10;
        await this.search();
    }

    movementLabel(type: InventoryMovementType): string {
        return this.movementTypes.find((item) => item.value === type)?.label ?? type;
    }

    private handleError(error: unknown): void {
        if (error instanceof HttpErrorResponse) {
            this.error.set(error.error?.message ?? 'No se pudo consultar el Kardex.');
            return;
        }

        this.error.set('Ocurrió un error al consultar el Kardex.');
    }
}
