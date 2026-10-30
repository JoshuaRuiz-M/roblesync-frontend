import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';

import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';

import type { SalesInvoiceStatus, SalesInvoiceWithDetails } from '../../models/sales-invoice.model';

import type { SalesOrder } from '../../../sales-orders/models/sales-order.model';
import type { Customer } from '../../../customers/models/customer.model';
import type { Product } from '../../../../catalog/products/models/product.model';

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

@Component({
    selector: 'app-sales-invoice-details',
    imports: [DrawerModule, ButtonModule, TagModule, DividerModule],
    templateUrl: './sales-invoice-details.html',
    styleUrl: './sales-invoice-details.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesInvoiceDetails {
    readonly visible = model(false);

    readonly invoice = input<SalesInvoiceWithDetails | null>(null);
    readonly orders = input<SalesOrder[]>([]);
    readonly customers = input<Customer[]>([]);
    readonly products = input<Product[]>([]);

    readonly canCancel = input(false);
    readonly processing = input(false);

    // eslint-disable-next-line @angular-eslint/no-output-native
    readonly cancel = output<SalesInvoiceWithDetails>();

    readonly order = computed(() => {
        const invoice = this.invoice();

        if (!invoice) {
            return null;
        }

        return (
            this.orders().find((order) => order.sales_order_id === invoice.sales_order_id) ?? null
        );
    });

    readonly customer = computed(() => {
        const invoice = this.invoice();

        if (!invoice) {
            return null;
        }

        return (
            this.customers().find((customer) => customer.customer_id === invoice.customer_id) ??
            null
        );
    });

    readonly status = computed(() => {
        const invoice = this.invoice();

        if (!invoice) {
            return {
                label: 'Desconocido',
                severity: 'secondary' as TagSeverity,
                icon: 'pi pi-question-circle',
            };
        }

        return this.getStatusConfig(invoice.status);
    });

    readonly canCancelInvoice = computed(
        () => this.canCancel() && this.invoice()?.status === 'ISSUED',
    );

    readonly totalQuantity = computed(
        () =>
            this.invoice()?.details.reduce((total, detail) => total + Number(detail.quantity), 0) ??
            0,
    );

    private readonly currencyFormatter = new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    private readonly quantityFormatter = new Intl.NumberFormat('es-GT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
    });

    private readonly unitPriceFormatter = new Intl.NumberFormat('es-GT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    });

    getProductName(productId: number): string {
        return (
            this.products().find((product) => product.product_id === productId)?.name ??
            `Producto #${productId}`
        );
    }

    getProductSku(productId: number): string {
        return (
            this.products().find((product) => product.product_id === productId)?.sku ??
            'Sin SKU disponible'
        );
    }

    formatCurrency(value: number): string {
        return this.currencyFormatter.format(Number(value));
    }

    formatUnitPrice(value: number): string {
        return `Q ${this.unitPriceFormatter.format(Number(value))}`;
    }

    formatQuantity(value: number): string {
        return this.quantityFormatter.format(Number(value));
    }

    formatDate(value: string | null): string {
        if (!value) {
            return 'No definida';
        }

        const [year, month, day] = value.slice(0, 10).split('-');

        if (!year || !month || !day) {
            return 'Fecha no disponible';
        }

        return `${day}/${month}/${year}`;
    }

    formatDateTime(value: string | null): string {
        if (!value) {
            return 'No definida';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return 'Fecha no disponible';
        }

        return new Intl.DateTimeFormat('es-GT', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    }

    onCancel(): void {
        const invoice = this.invoice();

        if (!invoice || !this.canCancelInvoice() || this.processing()) {
            return;
        }

        this.cancel.emit(invoice);
    }

    private getStatusConfig(status: SalesInvoiceStatus): {
        label: string;
        severity: TagSeverity;
        icon: string;
    } {
        const configs: Record<
            SalesInvoiceStatus,
            {
                label: string;
                severity: TagSeverity;
                icon: string;
            }
        > = {
            ISSUED: {
                label: 'Emitida',
                severity: 'success',
                icon: 'pi pi-check-circle',
            },
            CANCELLED: {
                label: 'Cancelada',
                severity: 'danger',
                icon: 'pi pi-times-circle',
            },
        };

        return configs[status];
    }
}
