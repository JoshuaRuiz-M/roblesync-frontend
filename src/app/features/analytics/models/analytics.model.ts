export type InventoryMovementType =
    | 'PURCHASE_RECEIPT'
    | 'SALE_DISPATCH'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT'
    | 'ADJUSTMENT_IN'
    | 'ADJUSTMENT_OUT'
    | 'RETURN_IN'
    | 'RETURN_OUT';

export interface KardexMovement {
    inventory_movement_id: number;
    warehouse_id: number;
    warehouse_name: string;
    product_id: number;
    product_name: string;
    batch_id: number | null;
    batch_number: string | null;
    movement_type: InventoryMovementType;
    movement_date: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
    balance_quantity: number;
    balance_value: number;
    reference_type: string | null;
    reference_id: number | null;
    notes: string | null;
    created_at: string;
    created_by: number;
}

export interface KardexFilters {
    product_id?: number;
    warehouse_id?: number;
    batch_id?: number;
    movement_type?: InventoryMovementType;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
}

export interface KardexSummaryFilters {
    product_id: number;
    warehouse_id: number;
    start_date?: string;
    end_date?: string;
}

export interface KardexSummary {
    product_id: number;
    warehouse_id: number;
    opening_quantity: number;
    opening_value: number;
    incoming_quantity: number;
    incoming_value: number;
    outgoing_quantity: number;
    outgoing_value: number;
    closing_quantity: number;
    closing_value: number;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface KardexMovementsResponse {
    success: boolean;
    data: KardexMovement[];
    meta: PaginationMeta;
}

export interface KardexSummaryResponse {
    success: boolean;
    data: KardexSummary;
}
