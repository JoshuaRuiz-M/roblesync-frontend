export type GoodsReceiptStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface GoodsReceipt {
    goods_receipt_id: number;
    receipt_number: string;
    purchase_order_id: number;
    warehouse_id: number;
    receipt_date: string;
    status: GoodsReceiptStatus;
    notes: string | null;
    confirmed_at: string | null;
    confirmed_by: number | null;
    created_at: string;
    created_by: number;
    updated_at: string | null;
    updated_by: number | null;
}

export interface GoodsReceiptDetail {
    goods_receipt_detail_id: number;
    goods_receipt_id: number;
    purchase_order_id: number;
    purchase_order_detail_id: number;
    batch_id: number;
    product_id: number;
    quantity_received: number;
    unit_cost: number;
    created_at: string;
    created_by: number;
}

export interface GoodsReceiptWithDetails extends GoodsReceipt {
    details: GoodsReceiptDetail[];
}

export interface CreateGoodsReceiptDetail {
    purchase_order_detail_id: number;
    quantity_received: number;
    batch_number?: string | null;
    manufacturing_date?: string | null;
    expiration_date?: string | null;
}

export interface CreateGoodsReceipt {
    purchase_order_id: number;
    warehouse_id: number;
    notes?: string | null;
    details: CreateGoodsReceiptDetail[];
}

export interface UpdateGoodsReceipt {
    warehouse_id?: number;
    notes?: string | null;
    details?: CreateGoodsReceiptDetail[];
}
