export interface Product {
    product_id: number;
    brand_id: number;
    product_line_id: number;
    unit_of_measure_id: number;
    sku: string;
    barcode: string;
    name: string;
    description?: string | null;
    weight?: number | null;
    average_cost: number;
    list_price: number;
    minimum_stock: number;
    maximum_stock: number;
    reorder_point: number;
    tracks_expiration: boolean;
    is_active: boolean;
    created_at: Date;
    created_by: number;
    updated_at?: Date | null;
    updated_by?: number | null;
}

export interface CreateProduct {
    brand_id: number;
    product_line_id: number;
    unit_of_measure_id: number;
    sku: string;
    barcode: string;
    name: string;
    description?: string | null;
    weight?: number | null;
    average_cost: number;
    list_price: number;
    minimum_stock: number;
    maximum_stock: number;
    reorder_point: number;
    tracks_expiration: boolean;
    is_active?: boolean;
}

export interface UpdateProduct {
    brand_id?: number;
    product_line_id?: number;
    unit_of_measure_id?: number;
    sku?: string;
    barcode?: string;
    name?: string;
    description?: string | null;
    weight?: number | null;
    average_cost?: number;
    list_price?: number;
    minimum_stock?: number;
    maximum_stock?: number;
    reorder_point?: number;
    tracks_expiration?: boolean;
    is_active?: boolean;
}

export interface ProductSupplier {
    product_supplier_id: number;
    product_id: number;
    supplier_id: number;
    is_preferred: boolean;
    is_active: boolean;
    created_at: Date;
    created_by: number;
    updated_at: Date | null;
    updated_by: number | null;
}

export interface ProductSupplierDetail extends ProductSupplier {
    tax_id: string;
    business_name: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
}

export interface CreateProductSupplier {
    supplier_id: number;
    is_preferred?: boolean;
    is_active?: boolean;
}

export interface UpdateProductSupplier {
    is_preferred?: boolean;
    is_active?: boolean;
}
