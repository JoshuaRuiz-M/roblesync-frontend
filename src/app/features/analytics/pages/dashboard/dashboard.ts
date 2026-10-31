import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AnalyticsService } from '../../services/analytics.service';

import type {
    DashboardDateFilters,
    DashboardOverview,
    DashboardSalesTrend,
    DashboardTopProduct,
    DashboardSalesByCategory,
    DashboardInventoryAlert,
    DashboardAlertType,
} from '../../models/dashboard.model';

type DashboardSection =
    | 'overview'
    | 'salesTrend'
    | 'topProducts'
    | 'salesByCategory'
    | 'inventoryAlerts';

type DashboardErrors = Partial<Record<DashboardSection, string>>;

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        CardModule,
        ChartModule,
        DatePickerModule,
        ProgressSpinnerModule,
        TableModule,
        TagModule,
    ],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
    private readonly analyticsService = inject(AnalyticsService);
    private readonly fb = inject(FormBuilder);

    readonly form = this.fb.group({
        start_date: this.fb.control<Date | null>(null),
        end_date: this.fb.control<Date | null>(null),
    });

    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly sectionErrors = signal<DashboardErrors>({});

    readonly overview = signal<DashboardOverview | null>(null);
    readonly salesTrend = signal<DashboardSalesTrend[]>([]);
    readonly topProducts = signal<DashboardTopProduct[]>([]);
    readonly salesByCategory = signal<DashboardSalesByCategory[]>([]);
    readonly inventoryAlerts = signal<DashboardInventoryAlert[]>([]);

    readonly hasData = computed(
        () =>
            this.overview() !== null ||
            this.salesTrend().length > 0 ||
            this.topProducts().length > 0 ||
            this.salesByCategory().length > 0 ||
            this.inventoryAlerts().length > 0,
    );

    readonly totalAlerts = computed(() => this.inventoryAlerts().length);

    readonly highPriorityAlerts = computed(
        () => this.inventoryAlerts().filter((alert) => alert.priority === 'HIGH').length,
    );

    readonly salesChartData = computed(() => ({
        labels: this.salesTrend().map((item) => this.formatPeriod(item.period)),
        datasets: [
            {
                label: 'Ventas',
                data: this.salesTrend().map((item) => Number(item.total_sales)),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                fill: true,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2,
            },
        ],
    }));

    readonly categoryChartData = computed(() => ({
        labels: this.salesByCategory().map((item) => item.category_name),
        datasets: [
            {
                data: this.salesByCategory().map((item) => Number(item.total_sales)),
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#8b5cf6',
                    '#ef4444',
                    '#06b6d4',
                    '#ec4899',
                    '#84cc16',
                ],
                borderWidth: 0,
                hoverOffset: 8,
            },
        ],
    }));

    readonly lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: (context: any) => `Ventas: ${this.formatCurrency(context.parsed.y)}`,
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
            },
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value: number | string) => this.formatCompactCurrency(Number(value)),
                },
            },
        },
    };

    readonly doughnutChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 18,
                },
            },
            tooltip: {
                callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: (context: any) =>
                        `${context.label}: ${this.formatCurrency(context.parsed)}`,
                },
            },
        },
    };

    ngOnInit(): void {
        this.loadDashboard();
    }

    loadDashboard(): void {
        if (this.loading()) {
            return;
        }

        const { start_date, end_date } = this.form.getRawValue();

        if (start_date && end_date && start_date > end_date) {
            this.error.set('La fecha inicial no puede ser mayor que la fecha final.');
            return;
        }

        const filters: DashboardDateFilters = {
            ...(start_date && {
                start_date: this.formatDate(start_date),
            }),
            ...(end_date && {
                end_date: this.formatDate(end_date),
            }),
        };

        this.loading.set(true);
        this.error.set(null);
        this.sectionErrors.set({});

        const errors: DashboardErrors = {};

        const handleError =
            <T>(section: DashboardSection, fallback: T) =>
            (error: unknown) => {
                console.error(`Error en ${section}:`, error);

                errors[section] = this.getErrorMessage(error);

                return of(fallback);
            };

        forkJoin({
            overview: this.analyticsService
                .getDashboardOverview(filters)
                .pipe(
                    catchError(handleError('overview', { data: null as DashboardOverview | null })),
                ),
            salesTrend: this.analyticsService.getDashboardSalesTrend(filters).pipe(
                catchError(
                    handleError('salesTrend', {
                        data: [] as DashboardSalesTrend[],
                    }),
                ),
            ),
            topProducts: this.analyticsService
                .getDashboardTopProducts({
                    ...filters,
                    top: 5,
                })
                .pipe(
                    catchError(
                        handleError('topProducts', {
                            data: [] as DashboardTopProduct[],
                        }),
                    ),
                ),
            salesByCategory: this.analyticsService.getDashboardSalesByCategory(filters).pipe(
                catchError(
                    handleError('salesByCategory', {
                        data: [] as DashboardSalesByCategory[],
                    }),
                ),
            ),
            inventoryAlerts: this.analyticsService
                .getDashboardInventoryAlerts({
                    expiration_days: 30,
                    top: 20,
                })
                .pipe(
                    catchError(
                        handleError('inventoryAlerts', {
                            data: [] as DashboardInventoryAlert[],
                        }),
                    ),
                ),
        })
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (response) => {
                    this.overview.set(response.overview.data);
                    this.salesTrend.set(response.salesTrend.data);
                    this.topProducts.set(response.topProducts.data);
                    this.salesByCategory.set(response.salesByCategory.data);
                    this.inventoryAlerts.set(response.inventoryAlerts.data);

                    this.sectionErrors.set({ ...errors });
                },
                error: (error) => {
                    console.error('Error general del Dashboard:', error);
                    this.error.set('No se pudo cargar la información del Dashboard.');
                },
            });
    }

    clearFilters(): void {
        this.form.reset();
        this.loadDashboard();
    }

    getSectionError(section: DashboardSection): string | null {
        return this.sectionErrors()[section] ?? null;
    }

    getAlertLabel(type: DashboardAlertType): string {
        const labels: Record<DashboardAlertType, string> = {
            OUT_OF_STOCK: 'Sin existencias',
            LOW_STOCK: 'Stock bajo',
            EXPIRED: 'Vencido',
            EXPIRING_SOON: 'Próximo a vencer',
        };

        return labels[type];
    }

    getAlertSeverity(priority: DashboardInventoryAlert['priority']): 'danger' | 'warn' {
        return priority === 'HIGH' ? 'danger' : 'warn';
    }

    formatCurrency(value: number | string | null | undefined): string {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(value ?? 0));
    }

    formatCompactCurrency(value: number): string {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ',
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(value);
    }

    formatNumber(value: number | string | null | undefined): string {
        return new Intl.NumberFormat('es-GT', {
            maximumFractionDigits: 3,
        }).format(Number(value ?? 0));
    }

    private formatPeriod(period: string): string {
        const [year, month] = period.split('-').map(Number);

        return new Intl.DateTimeFormat('es-GT', {
            month: 'short',
            year: '2-digit',
            timeZone: 'UTC',
        }).format(new Date(Date.UTC(year, month - 1, 1)));
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    private getErrorMessage(error: unknown): string {
        if (error && typeof error === 'object') {
            const httpError = error as {
                message?: string;
                error?: {
                    message?: string;
                };
            };

            return (
                httpError.error?.message ||
                httpError.message ||
                'No se pudo consultar esta sección.'
            );
        }

        return 'No se pudo consultar esta sección.';
    }
}
