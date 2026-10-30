export type WarehouseTransferStatus = 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface WarehouseTransfer {
    warehouse_transfer_id: number;
    transfer_number: string;
    source_warehouse_id: number;
    destination_warehouse_id: number;
    transfer_date: string;
    status: WarehouseTransferStatus;
    dispatched_at: string | null;
    dispatched_by: number | null;
    received_at: string | null;
    received_by: number | null;
    notes: string | null;
    created_at: string;
    created_by: number;
    updated_at: string | null;
    updated_by: number | null;
}

export interface WarehouseTransferDetail {
    warehouse_transfer_detail_id: number;
    warehouse_transfer_id: number;
    product_id: number;
    batch_id: number;
    quantity: number;
    unit_cost: number;
    created_at: string;
    created_by: number;
}

export interface WarehouseTransferWithDetails extends WarehouseTransfer {
    details: WarehouseTransferDetail[];
}

export interface CreateWarehouseTransferDetail {
    product_id: number;
    batch_id: number;
    quantity: number;
}

export interface CreateWarehouseTransfer {
    source_warehouse_id: number;
    destination_warehouse_id: number;
    notes?: string | null;
    details: CreateWarehouseTransferDetail[];
}

export interface UpdateWarehouseTransfer {
    source_warehouse_id?: number;
    destination_warehouse_id?: number;
    notes?: string | null;
    details?: CreateWarehouseTransferDetail[];
}
