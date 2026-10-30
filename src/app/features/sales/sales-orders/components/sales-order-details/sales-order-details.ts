import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';

import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';

import type {
    SalesOrder,
    SalesOrderStatus,
    SalesOrderCreditStatus,
    SalesOrderWithDetails,
} from '../../models/sales-order.model';

import type { Customer } from '../../../customers/models/customer.model';
import type { Saleperson } from '../../../salespersons/models/salesperson.model';
import type { Product } from '../../../../catalog/products/models/product.model';
import { Warehouse } from '../../../../inventory/warehouse/models/warehouse.model';

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

interface StatusConfig {
    label: string;
    severity: TagSeverity;
    icon: string;
}

@Component({
    selector: 'app-sales-order-details',
    imports: [DrawerModule, ButtonModule, TagModule, DividerModule],
    templateUrl: './sales-order-details.html',
    styleUrl: './sales-order-details.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesOrderDetails {
    readonly visible = model(false);

    readonly order = input<SalesOrderWithDetails | null>(null);
    readonly customers = input<Customer[]>([]);
    readonly salespersons = input<Saleperson[]>([]);
    readonly warehouses = input<Warehouse[]>([]);
    readonly products = input<Product[]>([]);

    readonly canEdit = input(false);
    readonly canSubmit = input(false);
    readonly canApprove = input(false);
    readonly canReserve = input(false);
    readonly canCancel = input(false);
    readonly canApproveCredit = input(false);
    readonly canRejectCredit = input(false);
    readonly processing = input(false);

    readonly edit = output<SalesOrderWithDetails>();
    // eslint-disable-next-line @angular-eslint/no-output-native
    readonly submit = output<SalesOrder>();
    readonly approve = output<SalesOrder>();
    readonly reserve = output<SalesOrder>();

    // eslint-disable-next-line @angular-eslint/no-output-native
    readonly cancel = output<SalesOrder>();

    readonly approveCredit = output<SalesOrder>();
    readonly rejectCredit = output<SalesOrder>();

    readonly customer = computed(() => {
        const order = this.order();

        if (!order) {
            return null;
        }

        return (
            this.customers().find((customer) => customer.customer_id === order.customer_id) ?? null
        );
    });

    readonly salesperson = computed(() => {
        const order = this.order();

        if (!order) {
            return null;
        }

        return (
            this.salespersons().find(
                (salesperson) => salesperson.salesperson_id === order.salesperson_id,
            ) ?? null
        );
    });

    readonly warehouse = computed(() => {
        const order = this.order();

        if (!order) {
            return null;
        }

        return (
            this.warehouses().find((warehouse) => warehouse.warehouse_id === order.warehouse_id) ??
            null
        );
    });

    readonly status = computed<StatusConfig>(() => {
        const order = this.order();

        return order
            ? this.getStatusConfig(order.status)
            : {
                  label: 'Desconocido',
                  severity: 'secondary',
                  icon: 'pi pi-question-circle',
              };
    });

    readonly creditStatus = computed<StatusConfig>(() => {
        const order = this.order();

        return order
            ? this.getCreditStatusConfig(order.credit_status)
            : {
                  label: 'Desconocido',
                  severity: 'secondary',
                  icon: 'pi pi-question-circle',
              };
    });

    readonly canEditOrder = computed(() => this.canEdit() && this.order()?.status === 'DRAFT');

    readonly canSubmitOrder = computed(() => this.canSubmit() && this.order()?.status === 'DRAFT');

    readonly canApproveOrder = computed(
        () =>
            this.canApprove() &&
            this.order()?.status === 'PENDING' &&
            this.order()?.credit_status !== 'REJECTED',
    );

    readonly canReserveOrder = computed(
        () =>
            this.canReserve() &&
            this.order()?.status === 'APPROVED' &&
            this.order()?.credit_status !== 'REJECTED',
    );

    readonly canCancelOrder = computed(
        () =>
            this.canCancel() &&
            !!this.order() &&
            this.order()?.status !== 'CANCELLED' &&
            this.order()?.status !== 'COMPLETED',
    );

    readonly canApproveCreditOrder = computed(
        () =>
            this.canApproveCredit() &&
            this.order()?.status === 'PENDING' &&
            this.order()?.credit_status === 'PENDING',
    );

    readonly canRejectCreditOrder = computed(
        () =>
            this.canRejectCredit() &&
            this.order()?.status === 'PENDING' &&
            this.order()?.credit_status === 'PENDING',
    );

    readonly totalQuantity = computed(
        () =>
            this.order()?.details.reduce((total, detail) => total + Number(detail.quantity), 0) ??
            0,
    );

    readonly totalReserved = computed(
        () =>
            this.order()?.details.reduce(
                (total, detail) => total + Number(detail.quantity_reserved),
                0,
            ) ?? 0,
    );

    private readonly currencyFormatter = new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    private readonly unitPriceFormatter = new Intl.NumberFormat('es-GT', {
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

    onEdit(): void {
        const order = this.order();

        if (!order || !this.canEditOrder() || this.processing()) {
            return;
        }

        this.edit.emit(order);
    }

    onSubmit(): void {
        const order = this.order();

        if (!order || !this.canSubmitOrder() || this.processing()) {
            return;
        }

        this.submit.emit(order);
    }

    onApprove(): void {
        const order = this.order();

        if (!order || !this.canApproveOrder() || this.processing()) {
            return;
        }

        this.approve.emit(order);
    }

    onReserve(): void {
        const order = this.order();

        if (!order || !this.canReserveOrder() || this.processing()) {
            return;
        }

        this.reserve.emit(order);
    }

    onCancel(): void {
        const order = this.order();

        if (!order || !this.canCancelOrder() || this.processing()) {
            return;
        }

        this.cancel.emit(order);
    }

    onApproveCredit(): void {
        const order = this.order();

        if (!order || !this.canApproveCreditOrder() || this.processing()) {
            return;
        }

        this.approveCredit.emit(order);
    }

    onRejectCredit(): void {
        const order = this.order();

        if (!order || !this.canRejectCreditOrder() || this.processing()) {
            return;
        }

        this.rejectCredit.emit(order);
    }

    private getStatusConfig(status: SalesOrderStatus): StatusConfig {
        const configs: Record<SalesOrderStatus, StatusConfig> = {
            DRAFT: {
                label: 'Borrador',
                severity: 'secondary',
                icon: 'pi pi-file-edit',
            },
            PENDING: {
                label: 'Pendiente',
                severity: 'warn',
                icon: 'pi pi-clock',
            },
            APPROVED: {
                label: 'Aprobada',
                severity: 'info',
                icon: 'pi pi-check-circle',
            },
            RESERVED: {
                label: 'Reservada',
                severity: 'info',
                icon: 'pi pi-box',
            },
            COMPLETED: {
                label: 'Completada',
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

    private getCreditStatusConfig(status: SalesOrderCreditStatus): StatusConfig {
        const configs: Record<SalesOrderCreditStatus, StatusConfig> = {
            PENDING: {
                label: 'Pendiente',
                severity: 'warn',
                icon: 'pi pi-clock',
            },
            APPROVED: {
                label: 'Autorizado',
                severity: 'success',
                icon: 'pi pi-check-circle',
            },
            REJECTED: {
                label: 'Rechazado',
                severity: 'danger',
                icon: 'pi pi-times-circle',
            },
        };

        return configs[status];
    }
}
