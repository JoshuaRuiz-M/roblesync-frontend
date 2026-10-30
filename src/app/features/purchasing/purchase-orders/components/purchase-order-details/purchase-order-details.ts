import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';

import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';

import type {
    PurchaseOrderStatus,
    PurchaseOrderWithDetails,
} from '../../models/purchase-order.model';

import type { Supplier } from '../../../suppliers/models/supplier.model';
import type { Product } from '../../../../catalog/products/models/product.model';

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

@Component({
    selector: 'app-purchase-order-details',
    imports: [DrawerModule, ButtonModule, TagModule, DividerModule],
    templateUrl: './purchase-order-details.html',
    styleUrl: './purchase-order-details.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderDetails {
    readonly visible = model(false);

    readonly order = input<PurchaseOrderWithDetails | null>(null);
    readonly suppliers = input<Supplier[]>([]);
    readonly products = input<Product[]>([]);

    readonly canEdit = input(false);
    readonly canApprove = input(false);
    readonly canCancel = input(false);
    readonly processing = input(false);

    readonly edit = output<PurchaseOrderWithDetails>();
    readonly approve = output<PurchaseOrderWithDetails>();
    // eslint-disable-next-line @angular-eslint/no-output-native
    readonly cancel = output<PurchaseOrderWithDetails>();

    readonly supplier = computed(() => {
        const order = this.order();

        if (!order) {
            return null;
        }

        return (
            this.suppliers().find((supplier) => supplier.supplier_id === order.supplier_id) ?? null
        );
    });

    readonly status = computed(() => {
        const order = this.order();

        if (!order) {
            return {
                label: 'Desconocido',
                severity: 'secondary' as TagSeverity,
                icon: 'pi pi-question-circle',
            };
        }

        return this.getStatusConfig(order.status);
    });

    readonly canEditOrder = computed(() => this.canEdit() && this.order()?.status === 'DRAFT');

    readonly canApproveOrder = computed(
        () => this.canApprove() && this.order()?.status === 'DRAFT',
    );

    readonly canCancelOrder = computed(
        () =>
            this.canCancel() &&
            (this.order()?.status === 'DRAFT' || this.order()?.status === 'APPROVED'),
    );

    readonly totalQuantity = computed(
        () =>
            this.order()?.details.reduce((total, detail) => total + Number(detail.quantity), 0) ??
            0,
    );

    private readonly currencyFormatter = new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    private readonly unitCostFormatter = new Intl.NumberFormat('es-GT', {
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

    formatUnitCost(value: number): string {
        return `Q ${this.unitCostFormatter.format(Number(value))}`;
    }

    formatQuantity(value: number): string {
        return new Intl.NumberFormat('es-GT', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        }).format(Number(value));
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

    onEdit(): void {
        const order = this.order();

        if (!order || !this.canEditOrder() || this.processing()) {
            return;
        }

        this.edit.emit(order);
    }

    onApprove(): void {
        const order = this.order();

        if (!order || !this.canApproveOrder() || this.processing()) {
            return;
        }

        this.approve.emit(order);
    }

    onCancel(): void {
        const order = this.order();

        if (!order || !this.canCancelOrder() || this.processing()) {
            return;
        }

        this.cancel.emit(order);
    }

    private getStatusConfig(status: PurchaseOrderStatus): {
        label: string;
        severity: TagSeverity;
        icon: string;
    } {
        const configs: Record<
            PurchaseOrderStatus,
            {
                label: string;
                severity: TagSeverity;
                icon: string;
            }
        > = {
            DRAFT: {
                label: 'Borrador',
                severity: 'secondary',
                icon: 'pi pi-file-edit',
            },
            APPROVED: {
                label: 'Aprobada',
                severity: 'info',
                icon: 'pi pi-check-circle',
            },
            PARTIALLY_RECEIVED: {
                label: 'Recibida parcialmente',
                severity: 'warn',
                icon: 'pi pi-truck',
            },
            RECEIVED: {
                label: 'Recibida',
                severity: 'success',
                icon: 'pi pi-check',
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
