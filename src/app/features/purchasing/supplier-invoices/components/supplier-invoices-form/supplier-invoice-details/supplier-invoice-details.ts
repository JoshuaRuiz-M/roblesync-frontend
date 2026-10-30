import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';

import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SupplierInvoice } from '../../../models/supplier-invoice.model';
import { Supplier } from '../../../../suppliers/models/supplier.model';
import { PurchaseOrder } from '../../../../purchase-orders/models/purchase-order.model';
import { SUPPLIER_INVOICE_STATUS_LABELS } from '../../../models/supplier-invoice-status.model';

@Component({
    selector: 'app-supplier-invoice-details',
    imports: [DatePipe, DrawerModule, ButtonModule, TagModule],
    templateUrl: './supplier-invoice-details.html',
    styleUrl: './supplier-invoice-details.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierInvoiceDetails {
    readonly visible = input(false);
    readonly visibleChange = output<boolean>();
    readonly invoice = input<SupplierInvoice | null>(null);
    readonly supplierItems = input<Supplier[]>([]);
    readonly purchaseOrderItems = input<PurchaseOrder[]>([]);
    readonly canEdit = input(false);
    readonly edit = output<SupplierInvoice>();

    readonly statusLabels = SUPPLIER_INVOICE_STATUS_LABELS;

    readonly supplier = computed(() =>
        this.supplierItems().find((item) => item.supplier_id === this.invoice()?.supplier_id),
    );

    readonly purchaseOrder = computed(() =>
        this.purchaseOrderItems().find(
            (item) => item.purchase_order_id === this.invoice()?.purchase_order_id,
        ),
    );

    private readonly currencyFormatter = new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    formatCurrency(value: number): string {
        return this.currencyFormatter.format(Number(value));
    }

    close(): void {
        this.visibleChange.emit(false);
    }

    onEdit(): void {
        const invoice = this.invoice();

        if (!invoice || !this.canEdit()) return;

        this.close();
        this.edit.emit(invoice);
    }
}
