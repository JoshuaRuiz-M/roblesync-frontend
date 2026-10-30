import { Component, computed, input, model, output } from '@angular/core';

import { DatePipe, DecimalPipe } from '@angular/common';

import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import {
    WarehouseTransferWithDetails,
    WarehouseTransferStatus,
} from '../../models/warehouse-transfer.model';

export interface WarehouseTransferCatalogItem {
    label: string;
    value: number;
}

export interface WarehouseTransferBatchItem extends WarehouseTransferCatalogItem {
    product_id: number;
}

@Component({
    selector: 'app-warehouse-transfer-details',
    standalone: true,
    imports: [DatePipe, DecimalPipe, DrawerModule, ButtonModule, TagModule],
    templateUrl: './warehouse-transfer-details.html',
    styleUrl: './warehouse-transfer-details.scss',
})
export class WarehouseTransferDetails {
    readonly visible = model<boolean>(false);

    readonly transfer = input<WarehouseTransferWithDetails | null>(null);

    readonly warehouses = input<WarehouseTransferCatalogItem[]>([]);
    readonly products = input<WarehouseTransferCatalogItem[]>([]);
    readonly batches = input<WarehouseTransferBatchItem[]>([]);

    readonly canEdit = input<boolean>(false);
    readonly canDispatch = input<boolean>(false);
    readonly canReceive = input<boolean>(false);
    readonly canCancel = input<boolean>(false);

    readonly processing = input<boolean>(false);

    readonly edit = output<number>();
    readonly dispatch = output<number>();
    readonly receive = output<number>();
    // eslint-disable-next-line @angular-eslint/no-output-native
    readonly cancel = output<number>();

    readonly totalQuantity = computed(() =>
        (this.transfer()?.details ?? []).reduce(
            (total, detail) => total + Number(detail.quantity),
            0,
        ),
    );

    readonly totalCost = computed(() =>
        (this.transfer()?.details ?? []).reduce(
            (total, detail) => total + Number(detail.quantity) * Number(detail.unit_cost),
            0,
        ),
    );

    readonly isDraft = computed(() => this.transfer()?.status === 'DRAFT');

    readonly isInTransit = computed(() => this.transfer()?.status === 'IN_TRANSIT');

    getWarehouseName(id: number): string {
        return this.warehouses().find((item) => item.value === id)?.label ?? `Bodega #${id}`;
    }

    getProductName(id: number): string {
        return this.products().find((item) => item.value === id)?.label ?? `Producto #${id}`;
    }

    getBatchName(id: number): string {
        return this.batches().find((item) => item.value === id)?.label ?? `Lote #${id}`;
    }

    getStatusLabel(status: WarehouseTransferStatus): string {
        const labels: Record<WarehouseTransferStatus, string> = {
            DRAFT: 'Borrador',
            IN_TRANSIT: 'En tránsito',
            RECEIVED: 'Recibida',
            CANCELLED: 'Cancelada',
        };

        return labels[status];
    }

    getStatusSeverity(
        status: WarehouseTransferStatus,
    ): 'secondary' | 'info' | 'success' | 'danger' {
        const severities: Record<
            WarehouseTransferStatus,
            'secondary' | 'info' | 'success' | 'danger'
        > = {
            DRAFT: 'secondary',
            IN_TRANSIT: 'info',
            RECEIVED: 'success',
            CANCELLED: 'danger',
        };

        return severities[status];
    }

    onEdit(): void {
        const transfer = this.transfer();

        if (!transfer || !this.canEdit() || transfer.status !== 'DRAFT' || this.processing()) {
            return;
        }

        this.edit.emit(transfer.warehouse_transfer_id);
    }

    onDispatch(): void {
        const transfer = this.transfer();

        if (!transfer || !this.canDispatch() || transfer.status !== 'DRAFT' || this.processing()) {
            return;
        }

        this.dispatch.emit(transfer.warehouse_transfer_id);
    }

    onReceive(): void {
        const transfer = this.transfer();

        if (
            !transfer ||
            !this.canReceive() ||
            transfer.status !== 'IN_TRANSIT' ||
            this.processing()
        ) {
            return;
        }

        this.receive.emit(transfer.warehouse_transfer_id);
    }

    onCancel(): void {
        const transfer = this.transfer();

        if (!transfer || !this.canCancel() || transfer.status !== 'DRAFT' || this.processing()) {
            return;
        }

        this.cancel.emit(transfer.warehouse_transfer_id);
    }
}
