import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';

import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';

import type { GoodsReceiptStatus, GoodsReceiptWithDetails } from '../../models/goods-receipt.model';

import type { PurchaseOrder } from '../../../purchase-orders/models/purchase-order.model';
import type { Product } from '../../../../catalog/products/models/product.model';
import { Warehouse } from '../../../../inventory/warehouse/models/warehouse.model';

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

@Component({
    selector: 'app-goods-receipt-details',
    imports: [DrawerModule, ButtonModule, TagModule, DividerModule],
    templateUrl: './goods-receipt-details.html',
    styleUrl: './goods-receipt-details.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoodsReceiptDetails {
    readonly visible = model(false);

    readonly receipt = input<GoodsReceiptWithDetails | null>(null);
    readonly orders = input<PurchaseOrder[]>([]);
    readonly warehouses = input<Warehouse[]>([]);
    readonly products = input<Product[]>([]);

    readonly canEdit = input(false);
    readonly canConfirm = input(false);
    readonly canCancel = input(false);
    readonly processing = input(false);

    readonly edit = output<GoodsReceiptWithDetails>();
    readonly confirm = output<GoodsReceiptWithDetails>();

    // eslint-disable-next-line @angular-eslint/no-output-native
    readonly cancel = output<GoodsReceiptWithDetails>();

    readonly order = computed(() => {
        const receipt = this.receipt();

        if (!receipt) {
            return null;
        }

        return (
            this.orders().find((order) => order.purchase_order_id === receipt.purchase_order_id) ??
            null
        );
    });

    readonly warehouse = computed(() => {
        const receipt = this.receipt();

        if (!receipt) {
            return null;
        }

        return (
            this.warehouses().find(
                (warehouse) => warehouse.warehouse_id === receipt.warehouse_id,
            ) ?? null
        );
    });

    readonly status = computed(() => {
        const receipt = this.receipt();

        if (!receipt) {
            return {
                label: 'Desconocido',
                severity: 'secondary' as TagSeverity,
                icon: 'pi pi-question-circle',
            };
        }

        return this.getStatusConfig(receipt.status);
    });

    readonly canEditReceipt = computed(() => this.canEdit() && this.receipt()?.status === 'DRAFT');

    readonly canConfirmReceipt = computed(
        () => this.canConfirm() && this.receipt()?.status === 'DRAFT',
    );

    readonly canCancelReceipt = computed(
        () => this.canCancel() && this.receipt()?.status === 'DRAFT',
    );

    readonly totalQuantity = computed(
        () =>
            this.receipt()?.details.reduce(
                (total, detail) => total + Number(detail.quantity_received),
                0,
            ) ?? 0,
    );

    readonly totalAmount = computed(
        () =>
            this.receipt()?.details.reduce(
                (total, detail) =>
                    total + Number(detail.quantity_received) * Number(detail.unit_cost),
                0,
            ) ?? 0,
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

    private readonly quantityFormatter = new Intl.NumberFormat('es-GT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
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

    onEdit(): void {
        const receipt = this.receipt();

        if (!receipt || !this.canEditReceipt() || this.processing()) {
            return;
        }

        this.edit.emit(receipt);
    }

    onConfirm(): void {
        const receipt = this.receipt();

        if (!receipt || !this.canConfirmReceipt() || this.processing()) {
            return;
        }

        this.confirm.emit(receipt);
    }

    onCancel(): void {
        const receipt = this.receipt();

        if (!receipt || !this.canCancelReceipt() || this.processing()) {
            return;
        }

        this.cancel.emit(receipt);
    }

    private getStatusConfig(status: GoodsReceiptStatus): {
        label: string;
        severity: TagSeverity;
        icon: string;
    } {
        const configs: Record<
            GoodsReceiptStatus,
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
            CONFIRMED: {
                label: 'Confirmada',
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
