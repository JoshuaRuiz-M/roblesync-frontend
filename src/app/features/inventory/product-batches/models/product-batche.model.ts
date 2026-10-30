export interface ProductBatch {
    batch_id: number;
    product_id: number;
    batch_number: string;
    manufacturing_date: Date | null;
    expiration_date: Date | null;
    received_at: Date;
    is_active: boolean;
    created_at: Date;
    created_by: number;
    updated_at: Date | null;
    updated_by: number | null;
}

export interface CreateProductBatch {
    product_id: number;
    batch_number: string;
    manufacturing_date: Date | null;
    expiration_date: Date | null;
    is_active: boolean;
    created_at: Date;
    created_by: number;
    updated_at: Date | null;
    updated_by: number | null;
}

export interface UpdateProductBatch {
    product_id?: number;
    batch_number?: string;
    manufacturing_date?: Date | null;
    expiration_date?: Date | null;
    is_active?: boolean;
    created_at?: Date;
    created_by?: number;
    updated_at?: Date | null;
    updated_by?: number | null;
}
